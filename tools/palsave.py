"""Läser Palworld-saves direkt från spelets egen mapp – helt read-only.

Filen öppnas alltid i 'rb'-läge och skrivs aldrig tillbaka; spelet kan ligga kvar
och köra medan vi läser.

Två kommandon:
    python palsave.py scan [mapp]      -> JSON med alla hittade världar
    python palsave.py read <Level.sav> -> JSON med { player, pals, ... }

`scan` utan argument letar i spelets egen mapp; med argument letar den i den mapp
man pekar ut (dedikerad server, molnsynkad mapp, kopierad save …).

Kräver `palworld-save-tools` (pip) samt libooz.dll som ligger bredvid den här filen
(Palworld ≥0.6 komprimerar saves med Oodle, magic "PlM" – vanlig zlib räcker inte).
"""

from __future__ import annotations

import contextlib
import ctypes
import io
import json
import os
import struct
import sys
import zlib
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------- Oodle (PlM)

# Var libooz.dll ligger. Kör vi som script är det bredvid den här filen; kör vi
# som paketerad palsave.exe har PyInstaller packat upp den i sin egen mapp och
# talar om var via sys._MEIPASS. Utan den grenen letar den frysta exe:n efter
# DLL:en i en mapp som inte finns.
_TOOLS_DIR = Path(getattr(sys, "_MEIPASS", None) or Path(__file__).resolve().parent)


_ooz_cache: Any = None


def _load_ooz() -> Any:
    """libooz.dll = open source-reimplementation av Oodle Kraken (zao/ooz)."""
    global _ooz_cache
    if _ooz_cache is not None:
        return _ooz_cache
    dll = _TOOLS_DIR / ("libooz.dll" if os.name == "nt" else "libooz.so")
    if not dll.exists():
        raise RuntimeError(
            f"Hittar inte {dll.name} i {_TOOLS_DIR}. "
            "Ladda ner den från https://github.com/zao/ooz/releases."
        )
    lib = ctypes.CDLL(str(dll))
    lib.Ooz_Decompress.argtypes = [
        ctypes.c_char_p,
        ctypes.c_size_t,
        ctypes.c_char_p,
        ctypes.c_size_t,
    ]
    lib.Ooz_Decompress.restype = ctypes.c_int
    _ooz_cache = lib
    return lib


def _oodle_decompress(body: bytes, out_len: int) -> bytes:
    buf = ctypes.create_string_buffer(out_len)
    written = _load_ooz().Ooz_Decompress(body, len(body), buf, out_len)
    if written != out_len:
        raise RuntimeError(
            f"Oodle-dekomprimering gav {written} byte, förväntade {out_len}."
        )
    return buf.raw[:out_len]


def decompress_sav(path: Path) -> bytes:
    """Packar upp en .sav till rå GVAS. Stödjer både PlZ (zlib) och PlM (Oodle)."""
    raw = path.read_bytes()
    if len(raw) < 12:
        raise RuntimeError(f"{path.name} är för liten för att vara en save.")

    uncompressed_len, compressed_len = struct.unpack_from("<II", raw, 0)
    magic = raw[8:11]
    save_type = raw[11]
    body = raw[12:]

    if len(body) != compressed_len:
        # Spelet kan ha varit mitt i en skrivning när vi läste.
        raise RuntimeError(
            f"{path.name} verkar halvskriven ({len(body)} byte, header säger "
            f"{compressed_len}). Vänta någon sekund och försök igen."
        )

    if magic == b"PlM":
        data = _oodle_decompress(body, uncompressed_len)
        if save_type == 0x32:  # dubbelpackad
            inner_len = struct.unpack_from("<II", data, 0)[0]
            data = _oodle_decompress(data[12:], inner_len)
    elif magic == b"PlZ":
        data = zlib.decompress(body)
        if save_type == 0x32:
            data = zlib.decompress(data)
    else:
        raise RuntimeError(
            f"Okänd save-magic {magic!r} i {path.name} (väntade PlM eller PlZ)."
        )

    if data[:4] != b"GVAS":
        raise RuntimeError(f"{path.name} packades upp men saknar GVAS-header.")
    return data


# ---------------------------------------------------------------- GVAS-parsning


class _StopParsing(Exception):
    """Kastas när vi läst klart de fält vi bryr oss om."""


#: Typer där headern efter storleksfältet bara är en optional_guid.
_PLAIN_PROPS = frozenset({
    "IntProperty", "UInt16Property", "UInt32Property", "Int64Property",
    "FixedPoint64Property", "FloatProperty", "StrProperty", "NameProperty",
})


def _skip_property(reader: Any, type_name: str, size: int, where: str) -> None:
    """Går förbi en property utan att tolka den.

    `size` täcker bara *värdet*. Varje typ har en egen header före det, och den
    måste läsas för att nästa property ska börja på rätt byte – tabellen nedan är
    avläst ur bibliotekets egen `FArchiveReader.property`.

    En okänd typ kastar hellre än gissar: en felräknad byte här ger inte ett fel
    utan en pal med påhittade siffror, och det är inget någon upptäcker. `where`
    säger var i saven det hände, för felet är det enda användaren ser.
    """
    if type_name == "BoolProperty":
        # Enda typen vars värde ligger i headern; `size` är 0.
        reader.bool()
        reader.optional_guid()
        return
    if type_name == "StructProperty":
        reader.fstring()
        reader.guid()
        reader.optional_guid()
    elif type_name == "MapProperty":
        reader.fstring()
        reader.fstring()
        reader.optional_guid()
    elif type_name in ("ArrayProperty", "EnumProperty", "ByteProperty"):
        reader.fstring()
        reader.optional_guid()
    elif type_name in _PLAIN_PROPS:
        reader.optional_guid()
    else:
        raise RuntimeError(f"Okänd property-typ {type_name!r} i {where}.")
    reader.skip(size)


def _read_world(data: bytes, wanted: set[str]) -> dict[str, Any]:
    """Parsar Level.sav men läser bara `wanted` och slutar när de är inne.

    Level.sav är ~27 MB och innehåller hela världen (kartobjekt, dungeons, foliage).
    Vi behöver bara pals + containrar. Två saker gör oss immuna mot resten:

    1. **Nycklar vi inte vill ha passeras oläst** (`_skip_property`). Det räckte
       länge att bara stanna tidigt, men en speluppdatering la in
       `LevelObjectRecoverPartySaveData` som nyckel FEM – före både
       `ItemContainerSaveData` och `CharacterContainerSaveData` – och den bär en
       karta med `Int64Property` som värde, en typ bibliotekets `prop_value` inte
       kan läsa. Hela inläsningen dog med "Unknown property value type" fast
       fältet inte angår oss. Att passera dem är dessutom det som gör läsningen
       snabb: `MapObjectSaveData` (12 MB) och `MapObjectSpawnerInStageSaveData`
       (8,6 MB) tolkades förut i sin helhet för att sedan slängas.
    2. **Vi stannar ändå så fort `wanted` är inne**, så allt efter den sista
       nyckeln rörs aldrig – t.ex. `InLockerCharacterInstanceIDArray`, som
       palworld-save-tools inte kan tolka alls.

    Skiptabellen kastar hellre än gissar, så en framtida nyckel av en typ vi inte
    känner igen ger ett tydligt fel i stället för pals med påhittade siffror.
    """
    from palworld_save_tools.archive import FArchiveReader
    from palworld_save_tools.gvas import GvasFile
    from palworld_save_tools.paltypes import PALWORLD_TYPE_HINTS

    grabbed: dict[str, Any] = {}

    def properties_until_end(self, path: str = "") -> dict[str, Any]:
        props: dict[str, Any] = {}
        while True:
            name = self.fstring()
            if name == "None":
                break
            type_name = self.fstring()
            size = self.u64()
            if path == ".worldSaveData" and name not in wanted:
                _skip_property(self, type_name, size, "Level.sav")
                continue
            props[name] = self.property(type_name, size, f"{path}.{name}")
            if path == ".worldSaveData":
                grabbed[name] = props[name]
                if wanted <= grabbed.keys():
                    raise _StopParsing()
        return props

    def pal_rawdata(reader, type_name, size, path):
        """Som rawdata.character.decode, men utan dess EOF-krav.

        Palworld 1.0 lägger till bytes efter group_id som 0.24-decodern inte
        känner igen; vi behöver ändå bara `object`.
        """
        value = reader.property(type_name, size, path, nested_caller_path=path)
        inner = reader.internal_copy(bytes(value["value"]["values"]), debug=False)
        value["value"] = {"object": inner.properties_until_end()}
        return value

    custom = {
        ".worldSaveData.CharacterSaveParameterMap.Value.RawData": (pal_rawdata, None),
    }

    original = FArchiveReader.properties_until_end
    FArchiveReader.properties_until_end = properties_until_end
    try:
        # palworld-save-tools print():ar "Struct type ... not found"-brus på stdout.
        with contextlib.redirect_stdout(io.StringIO()):
            GvasFile.read(data, PALWORLD_TYPE_HINTS, custom)
    except _StopParsing:
        pass
    finally:
        FArchiveReader.properties_until_end = original

    missing = wanted - grabbed.keys()
    if missing:
        raise RuntimeError(f"Saknar {', '.join(sorted(missing))} i Level.sav.")
    return grabbed


def _scalar(prop: Any, default: Any = None) -> Any:
    """Plockar ut värdet ur en GVAS-property (Byte/Enum har ett extra lager)."""
    if not isinstance(prop, dict):
        return default
    value = prop.get("value")
    if isinstance(value, dict):
        return value.get("value", default)
    return value if value is not None else default


def _guid(prop: Any) -> str | None:
    """GUID:er kommer som UUID-objekt ur parsern – vi jämför och sorterar som text."""
    if not isinstance(prop, dict):
        return None
    value = _scalar(prop)
    return str(value) if value is not None else None


# ---------------------------------------------------------------- Save-scanning

# Alpha-pals heter Boss_<art> i saven; övriga prefix dyker upp i events/dungeons.
# Saven blandar skiftlägen ("Boss_Anubis", "BOSS_..."), så jämförelsen är gemener.
_SPECIES_PREFIXES = ("boss_", "predator_", "summon_", "raid_")


def save_root() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    return Path(base) / "Pal" / "Saved" / "SaveGames"


def resolve_root(raw: str | None) -> Path:
    """Tolkar mappen användaren pekat ut; tomt betyder spelets egen mapp.

    Windows-sökvägar klistras ofta in med citattecken runt sig (Explorer gör det
    själv vid "Kopiera som sökväg"), och en del pekar rakt på Level.sav i stället
    för på mappen – båda ska funka utan att man behöver veta det.
    """
    text = (raw or "").strip().strip('"')
    if not text:
        return save_root()
    path = Path(os.path.expandvars(os.path.expanduser(text)))
    return path.parent if path.is_file() else path


# Hur många mappnivåer under den utpekade mappen vi letar. Spelets egen struktur
# är <konto>/<värld>/Level.sav (2), en dedikerad server har en nivå till, och
# pekar man rakt på världsmappen är det 0.
_SCAN_DEPTH = 4


def _world_meta(world_dir: Path) -> dict[str, Any]:
    """Läsbar identitet för en värld, ur `LevelMeta.sav`.

    Utan den här är en värld bara två GUID:er i gränssnittet – mappnamnet
    ("0D0E75DA…") och kontot ("76561198…"). Har man flera konton eller flera
    världar på samma dator går de i praktiken inte att skilja åt, och då hjälper
    det inte att man *får* välja.

    Filen är ~2 kB (mot Level.savs ~27 MB) och innehåller precis det man behöver:
    världens namn, värdens namn och nivå samt vilken dag det är i spelet. Den är
    därför billig nog att läsa för varje träff under en scanning.

    Allt är valfritt med flit: en lös kopierad `Level.sav` och vissa
    server-upplägg saknar `LevelMeta.sav`, och då ska scanningen ge samma svar
    som förut i stället för att misslyckas.
    """
    meta_path = world_dir / "LevelMeta.sav"
    if not meta_path.is_file():
        return {}
    try:
        from palworld_save_tools.gvas import GvasFile
        from palworld_save_tools.paltypes import PALWORLD_TYPE_HINTS

        with contextlib.redirect_stdout(io.StringIO()):
            gvas = GvasFile.read(decompress_sav(meta_path), PALWORLD_TYPE_HINTS, {})
        save_data = gvas.properties["SaveData"]["value"]
    except Exception:
        return {}

    out: dict[str, Any] = {}
    world_name = _scalar(save_data.get("WorldName"), "") or ""
    host = _scalar(save_data.get("HostPlayerName"), "") or ""
    # Spelet tillåter tomma namn; en tom sträng är sämre än att låta bli.
    if world_name.strip():
        out["worldName"] = world_name.strip()
    if host.strip():
        out["host"] = host.strip()
    level = _scalar(save_data.get("HostPlayerLevel"))
    if level:
        out["hostLevel"] = int(level)
    day = _scalar(save_data.get("InGameDay"))
    if day:
        out["day"] = int(day)
    return out


def scan_saves(root: Path) -> list[dict[str, Any]]:
    """Letar upp alla Level.sav under `root` (hoppar över spelets backup-mappar)."""
    found: list[dict[str, Any]] = []
    if not root.is_dir():
        return found

    seen: set[str] = set()
    for depth in range(_SCAN_DEPTH + 1):
        for level in sorted(root.glob("/".join(["*"] * depth + ["Level.sav"]))):
            # Bara mapparna *under* root får diskvalificera – root själv kan
            # mycket väl heta något med "backup" i (t.ex. en egen kopia).
            if any("backup" in part.lower() for part in level.relative_to(root).parts):
                continue
            key = str(level).lower()
            if key in seen:
                continue
            seen.add(key)
            try:
                stat = level.stat()
            except OSError:
                continue
            world_dir = level.parent
            players = sorted(p.name for p in (world_dir / "Players").glob("*.sav")
                             if not p.name.endswith("_dps.sav"))
            found.append(
                {
                    "path": str(level),
                    "world": world_dir.name,
                    "account": world_dir.parent.name,
                    "size": stat.st_size,
                    "modified": int(stat.st_mtime),
                    "players": len(players),
                    **_world_meta(world_dir),
                }
            )
    # Senast spelade världen först – den är nästan alltid den man vill läsa in.
    found.sort(key=lambda entry: entry["modified"], reverse=True)
    return found


# ---------------------------------------------------------------- Extrahering


def _player_save_data(world_dir: Path) -> tuple[Path, dict[str, Any]] | None:
    """Spelarens .sav: filen och dess SaveData (~50 kB, så den läses helt).

    Filen bär tre saker vi vill ha: container-id:n (Palbox/Party), hela
    progressionen (RecordData + questarrayerna) – och genom sitt eget namn vägen
    till den globala palboxen, som ligger som `<samma guid>_dps.sav` bredvid.
    Därför returneras sökvägen och inte bara datan.

    Den parsas i sin helhet med bibliotekets vanliga läsare – till skillnad från
    Level.sav finns här inga trasiga rawdata-typer, verifierat mot en riktig
    1.0-save 2026-08-11.
    """
    for player_sav in sorted((world_dir / "Players").glob("*.sav")):
        if player_sav.name.endswith("_dps.sav"):
            continue
        try:
            from palworld_save_tools.gvas import GvasFile
            from palworld_save_tools.paltypes import PALWORLD_TYPE_HINTS

            with contextlib.redirect_stdout(io.StringIO()):
                gvas = GvasFile.read(
                    decompress_sav(player_sav), PALWORLD_TYPE_HINTS, {}
                )
            return player_sav, gvas.properties["SaveData"]["value"]
        except Exception:
            continue  # kan inte läsa spelarfilen – nästa, eller fall tillbaka
    return None


def _progress(save_data: dict[str, Any]) -> dict[str, Any]:
    """Spelarens progression ur RecordData + questarrayerna.

    Nyckelformaten (uppmätta mot en riktig 1.0-save):
    - `TowerBossDefeatFlag`: läsbara namn, `BOSS_BATTLE_NAME_ElectricBoss` …
      Prefixet skalas av här så appen slipper känna till det.
    - `RelicObtainForInstanceFlag` (effigies) och `FastTravelPointUnlockFlag`:
      GUID-hex utan streck, versaler – SAMMA id:n som uppströms
      `relics.json`/`fast_travel_points.json` i palworld-save-pal, så kartan
      kan pricka av exakt vilka som hittats.
    - `NormalBossDefeatFlag`: spawner-id:n (`81_1_grass_FBOSS_20`), matchar
      `bosses.json`-spawners för alfabossar på kartan.
    - Questarrayerna ligger UTANFÖR RecordData, direkt i SaveData.
      `Hidden_*` är spelets interna triggrar och filtreras bort.

    Bara sanna flaggor tas med, och allt sorteras så att två inläsningar av
    samma save ger byte-identisk JSON.
    """
    rd = save_data.get("RecordData", {}).get("value", {})

    def flags(name: str, strip: str = "") -> list[str]:
        rows = rd.get(name, {}).get("value", [])
        keys = (str(r.get("key", "")) for r in rows if r.get("value"))
        return sorted(k[len(strip):] if strip and k.startswith(strip) else k for k in keys if k)

    def count(name: str) -> int:
        value = _scalar(rd.get(name), 0)
        return int(value) if isinstance(value, (int, float)) else 0

    raids: dict[str, int] = {}
    for row in rd.get("RaidBossDefeatCount", {}).get("value", []):
        key = str(row.get("key", ""))
        if key and isinstance(row.get("value"), (int, float)) and row["value"] > 0:
            raids[key] = int(row["value"])

    # 1.0 delade upp relikerna i typer (effigies = CapturePower, hopp, glid …).
    # Den platta flaggkartan speglar BARA CapturePower; resten ligger i
    # by-type-arrayen. Unionen av alla sanna GUID:n är det kartan vill ha —
    # varje relik-instans prickas av oavsett typ.
    relic_guids = set(flags("RelicObtainForInstanceFlag"))
    for entry in rd.get("RelicObtainForInstanceFlagByType", {}).get("value", {}).get("values", []):
        if not isinstance(entry, dict):
            continue
        for row in entry.get("Flags", {}).get("value", []):
            if row.get("value") and row.get("key"):
                relic_guids.add(str(row["key"]))

    def quest_ids(name: str) -> list[str]:
        # 1.0 döpte om arrayerna med suffixet _FullRelease; en pre-1.0-save har
        # bara de nakna namnen och ingen save bär båda. Ta det som finns.
        raw = save_data.get(f"{name}_FullRelease", save_data.get(name, {})).get("value", {})
        values = raw.get("values", []) if isinstance(raw, dict) else []
        out: list[str] = []
        for row in values:
            # Aktiva quests är structs med QuestName; avklarade är rena namn.
            qid = (
                _scalar(row.get("QuestName"), "")
                if isinstance(row, dict)
                else str(row or "")
            )
            if qid and not qid.startswith("Hidden_"):
                out.append(qid)
        return out

    # Nedläggsräknare per torn OCH svårighetsgrad – nycklarna bär suffixet
    # ("GrassBoss_Normal", förväntat "GrassBoss_Hard"). Exporteras ordagrant:
    # hard-suffixet är härlett ur speldatan men ännu inte observerat i en save,
    # så appen tolkar suffixet i stället för att vi gissar här.
    tower_clears: dict[str, int] = {}
    for row in rd.get("TowerBossDefeatCount", {}).get("value", []):
        key = str(row.get("key", ""))
        if key and isinstance(row.get("value"), (int, float)) and row["value"] > 0:
            tower_clears[key] = int(row["value"])

    return {
        "towers": flags("TowerBossDefeatFlag", strip="BOSS_BATTLE_NAME_"),
        "towerClears": dict(sorted(tower_clears.items())),
        "raids": dict(sorted(raids.items())),
        "relics": sorted(relic_guids),
        "relicHeld": count("RelicPossessNum"),
        "travels": flags("FastTravelPointUnlockFlag"),
        "fieldBosses": flags("NormalBossDefeatFlag"),
        "counts": {
            "dungeons": count("NormalDungeonClearCount"),
            "fixedDungeons": count("FixedDungeonClearCount"),
            "oilrigs": count("OilrigClearCount"),
            "camps": count("CampConqueredCount"),
            "predators": count("PredatorDefeatCount"),
            "treasure": count("FoundTreasureCount"),
        },
        "quests": {
            "active": quest_ids("OrderedQuestArray"),
            "completed": quest_ids("CompletedQuestArray"),
        },
        # Paldeck-posterna är artkoder (samma som Species.code) – "upptäckt",
        # vilket är mer än "äger just nu": en bortmatad art är fortfarande sedd.
        "deck": flags("PaldeckUnlockFlag"),
    }


def _container_names(
    containers: list[dict[str, Any]], save_data: dict[str, Any] | None
) -> dict[str, str]:
    """Ger varje container-GUID ett namn: Palbox, Party eller Bas/övrigt N.

    Spelarens .sav pekar ut Palbox och Party exakt; övriga containrar är
    basläger/förvaring och numreras i den ordning de ligger i saven.
    """
    palbox_id = party_id = None
    if save_data is not None:
        try:
            palbox_id = _guid(save_data["PalStorageContainerId"]["value"]["ID"])
            party_id = _guid(save_data["OtomoCharacterContainerId"]["value"]["ID"])
        except (KeyError, TypeError):
            pass  # ovanlig spelarfil – vi faller tillbaka på storlek

    names: dict[str, str] = {}
    fallback_palbox = None
    if palbox_id is None:
        # Utan spelarfil: den överlägset största containern är Palboxen.
        largest = max(
            containers,
            key=lambda c: _scalar(c["value"].get("SlotNum"), 0) or 0,
            default=None,
        )
        fallback_palbox = _guid(largest["key"]["ID"]) if largest else None

    rest: list[str] = []
    for container in containers:
        guid = _guid(container["key"]["ID"])
        if guid is None:
            continue
        slots = _scalar(container["value"].get("SlotNum"), 0) or 0
        if guid == palbox_id or (palbox_id is None and guid == fallback_palbox):
            names[guid] = "Palbox"
        elif guid == party_id or (palbox_id is None and slots == 5):
            names[guid] = "Party"
        else:
            rest.append(guid)

    # Sorterat på GUID så basläger får samma nummer vid varje inläsning.
    for base_no, guid in enumerate(sorted(rest), start=1):
        names[guid] = f"Bas/övrigt {base_no}"
    return names


#: Prefixet på det som Pal Surgery Table stoppar in i en pal. Resten av
#: item-id:t ÄR passivens id, så inget uppslag behövs: id:t
#: `PalPassiveSkillChange_Consumable_MoveSpeed_up_3` är ett implantat för Swift.
_IMPLANT_PREFIX = "PalPassiveSkillChange_Consumable_"


def _slot_item(blob: Any) -> tuple[str, int] | None:
    """(item-id, antal) ur en item-slots RawData – eller None om den inte går att läsa.

    Layouten är inte en property-lista utan en packad struct, och det är därför
    bibliotekets egen avkodare inte duger: paltypes markerar
    `ItemContainerSaveData.Value.Slots.Slots.RawData` som trasig sedan v0.3.7
    ("UObject fields encoded into raw data"). Samma läge som pal-RawData, alltså
    samma lösning – en tolerant egen läsare:

        int32  slotIndex
        int32  stackCount
        int32  längd på id:t, NUL inräknad
        char[] id + NUL
        …därefter dynamisk item-data vi inte bryr oss om

    Uppmätt mot en riktig 1.0-save: `00000000 d4020000 06000000 "Money\\0"` är
    slot 0 med 724 guld. Vi läser aldrig till EOF med flit – svansen är UUID:n
    och nollor, och att kräva EOF är precis vad som gör bibliotekets avkodare
    värdelös här.
    """
    b = bytes(blob)
    if len(b) < 13:
        return None
    try:
        _index, count = struct.unpack_from("<ii", b, 0)
        (length,) = struct.unpack_from("<i", b, 8)
    except struct.error:
        return None
    # Negativ längd = UTF-16 i Unreals fstring. Item-id:n är ASCII; en negativ
    # längd betyder att vi läst fel och ska släppa sloten, inte gissa.
    if length <= 1 or 12 + length > len(b):
        return None
    raw = b[12 : 12 + length - 1]
    if not all(32 <= c < 127 for c in raw):
        return None
    return raw.decode("ascii"), count


#: Pal Souls (Statue of Power-valutan), verifierade mot items.json aug 2026.
_SOUL_IDS = {
    "PalUpgradeStone": "s",  # Small
    "PalUpgradeStone2": "m",  # Medium
    "PalUpgradeStone3": "l",  # Large
    "PalUpgradeStone4": "g",  # Giant
}


def _stash_items(containers: Any) -> tuple[dict[str, int], dict[str, int]]:
    """(implantat, själar) ur alla item-behållare i världen.

    Alla behållare räknas, inte bara spelarens: ett implantat i en kista hemma i
    basen är lika mycket ditt som ett i ryggsäcken. Det som INTE görs är att läsa
    ut hela inventariet – bara implantaten och Pal Souls (själsrådgivningen
    behöver plånboken). Dels för att resten inte används av någonting, dels för
    att `pal-data.json` följer med i installern och 526 item-id:n ur någons
    värld inte hör dit.
    """
    owned: dict[str, int] = {}
    souls = {"s": 0, "m": 0, "l": 0, "g": 0}
    for entry in containers:
        slots = entry.get("value", {}).get("Slots", {}).get("value", {}).get("values", [])
        for slot in slots:
            blob = slot.get("RawData", {}).get("value", {}).get("values")
            if not blob:
                continue
            got = _slot_item(blob)
            if got is None:
                continue
            item_id, count = got
            if count <= 0:
                continue
            if item_id.startswith(_IMPLANT_PREFIX):
                passive = item_id[len(_IMPLANT_PREFIX) :]
                if passive:
                    owned[passive] = owned.get(passive, 0) + count
            elif item_id in _SOUL_IDS:
                souls[_SOUL_IDS[item_id]] += count
    return owned, souls


# ------------------------------------------------- Globala palboxen (_dps.sav)

#: Behållarnamnet den globala palboxen får i `OwnedPal.c`. Appen matchar på
#: strängen (se `inBase` i src/lib/breedRate.ts, som måste veta att lagret INTE
#: är en bas) – byt den inte utan att söka igenom src/.
_GLOBAL_CONTAINER = "Global palbox"

#: Fälten vi tolkar ur varje post. Allt annat passeras oläst – se `_read_dps`.
_DPS_FIELDS = frozenset({
    "CharacterID", "Gender", "Level", "Exp", "NickName", "IsPlayer", "IsRarePal",
    "Talent_HP", "Talent_Shot", "Talent_Defense", "PassiveSkillList", "Rank",
    "Rank_HP", "Rank_Attack", "Rank_Defence", "Rank_CraftSpeed",
    "FullStomach", "SanityValue",
})

def _skim_properties(reader: Any, wanted: frozenset[str]) -> dict[str, Any]:
    """Läser en property-lista men tolkar bara `wanted`; resten passeras."""
    props: dict[str, Any] = {}
    while True:
        name = reader.fstring()
        if name == "None":
            break
        type_name = reader.fstring()
        size = reader.u64()
        if name in wanted:
            # Bibliotekets egen läsare för fälten vi behöver, så vår skiptabell
            # aldrig kan glida isär från hur värdena faktiskt tolkas.
            props[name] = reader.property(type_name, size, f".{name}")
        else:
            _skip_property(reader, type_name, size, "den globala palboxen")
    return props


def _read_dps(dps_path: Path) -> list[dict[str, Any]]:
    """Pals ur den globala palboxen (Dimensional Pal Storage), i appens format.

    Lagret är världsöverskridande och ligger i spelarens egen `<guid>_dps.sav` –
    alltså varken i Level.sav eller i någon av världens containrar. Pals man lagt
    undan där syns ingen annanstans: verifierat mot en riktig 1.0-save, noll
    överlapp i instans-GUID mot Level.sav. Ingen dedup behövs alltså.

    Filen skimmas i stället för att parsas helt, och det är en förutsättning
    snarare än en finess. Alla 9 600 slottar ligger fullt utskrivna i filen även
    när de är tomma (`CharacterID` = "None") – i Kens save är 33 använda – vilket
    ger 73 MB uppackad GVAS. Bibliotekets vanliga läsare klarar filen men bygger
    ett objektträd för allihop: uppmätt 5,7 s och 554 MB, mot 1,7 s och 147 MB
    för att bara tolka fälten vi använder. Det här är ett paketerat program som
    andra kör, så både sekunderna och halvgigat är verkliga.

    Skimningen är verifierad fält för fält mot bibliotekets läsare på samma save:
    samma 33 pals, samma värden, samma instans-GUID:n.
    """
    from palworld_save_tools.archive import FArchiveReader
    from palworld_save_tools.gvas import GvasHeader

    reader = FArchiveReader(decompress_sav(dps_path), {}, debug=False)
    GvasHeader.read(reader)

    name = reader.fstring()
    type_name = reader.fstring()
    reader.u64()
    if name != "SaveParameterArray" or type_name != "ArrayProperty":
        raise RuntimeError(
            f"{dps_path.name} börjar med {name!r} ({type_name}); "
            "väntade SaveParameterArray som ArrayProperty."
        )
    array_type = reader.fstring()
    if array_type != "StructProperty":
        raise RuntimeError(f"{dps_path.name}: oväntad arraytyp {array_type!r}.")
    reader.optional_guid()
    slots = reader.u32()
    reader.fstring()  # prop_name
    reader.fstring()  # prop_type
    reader.u64()
    reader.fstring()  # struct-typ: PalDimensionPalStorageSaveParameter
    reader.guid()
    reader.skip(1)

    pals: list[dict[str, Any]] = []
    for slot in range(slots):
        param: dict[str, Any] | None = None
        instance: str | None = None
        while True:
            field = reader.fstring()
            if field == "None":
                break
            field_type = reader.fstring()
            size = reader.u64()
            if field == "SaveParameter":
                reader.fstring()
                reader.guid()
                reader.optional_guid()
                param = _skim_properties(reader, _DPS_FIELDS)
            elif field == "InstanceId":
                # Structen bär spelar-uid, instans-id och ett felsökningsnamn.
                inner = reader.property(field_type, size, ".InstanceId")
                instance = _guid(inner.get("value", {}).get("InstanceId"))
            else:
                _skip_property(reader, field_type, size, "den globala palboxen")
        if param is None:
            continue
        # Sloten är postens plats i arrayen, inte `SlotId.SlotIndex`: det fältet
        # följer med palen från där den låg förut och är inte unikt här (två par
        # delade index i Kens save). Vi vill ha en stabil sortering.
        row = _pal_row(param, instance, _GLOBAL_CONTAINER, slot)
        if row is not None:
            pals.append(row)
    return pals


# ---------------------------------------------------------------- Pal → appen


def _species_code(character_id: str) -> tuple[str, bool]:
    """Artkod + alfaflagga ur savens CharacterID.

    Prefixen kan ligga i lager, och saven blandar skiftlägen ("Boss_Anubis",
    "BOSS_…") – därför loopen och jämförelsen i gemener.
    """
    code = character_id
    boss = False
    changed = True
    while changed:
        changed = False
        for prefix in _SPECIES_PREFIXES:
            if code.lower().startswith(prefix):
                boss = boss or prefix == "boss_"
                code = code[len(prefix):]
                changed = True
    return code, boss


def _pal_row(
    param: dict[str, Any], instance: str | None, container: str, slot: int
) -> dict[str, Any] | None:
    """En pal i appens format – delad av Level.sav och den globala palboxen.

    Att båda läsarna går genom den här är hela poängen: fälten ska inte kunna
    glida isär så att en pal betyder olika saker beroende på var den låg.

    None betyder "det här är ingen pal": en tom lagerslot (`CharacterID` saknas
    eller är "None") eller en spelare.
    """
    if _scalar(param.get("IsPlayer"), False):
        return None
    character_id = _scalar(param.get("CharacterID"), "") or ""
    if not character_id or character_id == "None":
        return None

    code, boss = _species_code(character_id)
    gender_raw = _scalar(param.get("Gender"), "") or ""
    gender = "F" if "Female" in gender_raw else "M" if "Male" in gender_raw else "?"
    stomach = _scalar(param.get("FullStomach"))

    return {
        "id": str(instance or "")[:8],
        "code": code,
        "g": gender,
        "lv": int(_scalar(param.get("Level"), 1) or 1),
        "iv": [
            int(_scalar(param.get("Talent_HP"), 0) or 0),
            int(_scalar(param.get("Talent_Shot"), 0) or 0),
            int(_scalar(param.get("Talent_Defense"), 0) or 0),
        ],
        "pv": list(param.get("PassiveSkillList", {}).get("value", {}).get("values", [])),
        "rk": int(_scalar(param.get("Rank"), 1) or 1),
        "souls": [
            int(_scalar(param.get("Rank_HP"), 0) or 0),
            int(_scalar(param.get("Rank_Attack"), 0) or 0),
            int(_scalar(param.get("Rank_Defence"), 0) or 0),
            int(_scalar(param.get("Rank_CraftSpeed"), 0) or 0),
        ],
        "c": container,
        "slot": slot,
        "nick": _scalar(param.get("NickName"), "") or "",
        "boss": boss,
        "lucky": bool(_scalar(param.get("IsRarePal"), False)),
        "fd": round(stomach) if stomach is not None else None,
        "sn": round(_scalar(param.get("SanityValue"), 100) or 100),
        "xp": int(_scalar(param.get("Exp"), 0) or 0),
    }


def read_save(level_path: Path) -> dict[str, Any]:
    """Läser Level.sav och returnerar pals + spelarnamn i appens format."""
    world = _read_world(
        decompress_sav(level_path),
        # ItemContainerSaveData är nyckel 9 och CharacterContainerSaveData 11, så
        # implantaten är gratis: vi går redan förbi dem innan vi stannar. De
        # ligger dessutom före InLockerCharacterInstanceIDArray, som biblioteket
        # inte kan tolka alls – ordningen är alltså inte en detalj. (Numren steg
        # ett steg aug 2026 när LevelObjectRecoverPartySaveData kom in som femma;
        # ordningen är alltså inte heller något att skriva in i logiken.)
        {"CharacterSaveParameterMap", "ItemContainerSaveData", "CharacterContainerSaveData"},
    )
    characters = world["CharacterSaveParameterMap"]["value"]
    containers = world["CharacterContainerSaveData"]["value"]
    player = _player_save_data(level_path.parent)
    player_sav, player_sd = player if player is not None else (None, None)
    names = _container_names(containers, player_sd)
    implants, souls = _stash_items(world["ItemContainerSaveData"]["value"])
    # None = spelarfilen gick inte att läsa. Då utelämnas fältet helt (JSON
    # utan nyckel → undefined → "vet inte"), precis som implants-disciplinen.
    progress = _progress(player_sd) if player_sd is not None else None

    pals: list[dict[str, Any]] = []
    player_name = ""

    for entry in characters:
        try:
            param = entry["value"]["RawData"]["value"]["object"]["SaveParameter"]["value"]
        except (KeyError, TypeError):
            continue

        if _scalar(param.get("IsPlayer"), False):
            if not player_name:
                player_name = _scalar(param.get("NickName"), "") or ""
            continue

        slot = param.get("SlotId", {}).get("value", {})
        container_guid = _guid(
            slot.get("ContainerId", {}).get("value", {}).get("ID")
        )
        row = _pal_row(
            param,
            _guid(entry["key"]["InstanceId"]),
            names.get(container_guid or "", "Okänd"),
            int(_scalar(slot.get("SlotIndex"), 0) or 0),
        )
        if row is not None:
            pals.append(row)

    # Den globala palboxen ligger bredvid spelarfilen. Att den inte går att läsa
    # får inte fälla inläsningen – världens box är huvudsaken – men det får
    # heller inte tigas ihjäl: en global box som tyst blev tom ser precis ut som
    # en global box som *är* tom, och skillnaden är avelsstammen man lagt undan.
    # Därför rapporteras utfallet i stället för att antas.
    global_box: dict[str, Any] = {"found": False, "pals": 0}
    if player_sav is not None:
        dps_path = player_sav.with_name(f"{player_sav.stem}_dps.sav")
        if dps_path.is_file():
            global_box["found"] = True
            try:
                stored = _read_dps(dps_path)
            except Exception as error:
                global_box["error"] = str(error)
            else:
                pals.extend(stored)
                global_box["pals"] = len(stored)

    seen_containers = set(names.values())
    if global_box["pals"]:
        seen_containers.add(_GLOBAL_CONTAINER)

    result = {
        "player": player_name,
        "pals": pals,
        "containers": sorted(seen_containers),
        "implants": implants,
        "souls": souls,
        "globalBox": global_box,
    }
    if progress is not None:
        result["progress"] = progress
    return result


# ---------------------------------------------------------------- CLI

def main() -> int:
    # Svenska tecken måste överleva vägen till Node oavsett konsolens kodsida.
    sys.stdout.reconfigure(encoding="utf-8")

    command = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        if command == "scan":
            root = resolve_root(sys.argv[2] if len(sys.argv) > 2 else None)
            result: Any = {
                "ok": True,
                "saves": scan_saves(root),
                "root": str(root),
                "exists": root.is_dir(),
                "default": len(sys.argv) <= 2 or not sys.argv[2].strip(),
            }
        elif command == "read" and len(sys.argv) > 2:
            path = Path(sys.argv[2])
            if not path.is_file():
                raise RuntimeError(f"Hittar ingen fil på {path}")
            result = {"ok": True, **read_save(path), "path": str(path),
                      "modified": int(path.stat().st_mtime)}
        else:
            raise RuntimeError("Användning: palsave.py scan | palsave.py read <Level.sav>")
    except Exception as error:  # rapporteras som JSON så webbappen kan visa det
        result = {"ok": False, "error": str(error)}

    # Endast JSON på stdout – all diagnostik från biblioteken är redan tystad.
    json.dump(result, sys.stdout, ensure_ascii=False)
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
