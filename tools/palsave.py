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


def _read_world(data: bytes, wanted: set[str]) -> dict[str, Any]:
    """Parsar Level.sav men slutar så fort `wanted` är inlästa.

    Level.sav är ~27 MB och innehåller hela världen (kartobjekt, dungeons, foliage).
    Vi behöver bara pals + containrar, som ligger tidigt i filen. Att stanna där
    är både mycket snabbare och gör oss immuna mot nya property-typer längre bak
    som palworld-save-tools ännu inte kan läsa (t.ex. SetProperty i Palworld 1.0).
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
            props[name] = self.property(type_name, size, f"{path}.{name}")
            if path == ".worldSaveData" and name in wanted:
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


def _container_names(
    containers: list[dict[str, Any]], world_dir: Path
) -> dict[str, str]:
    """Ger varje container-GUID ett namn: Palbox, Party eller Bas/övrigt N.

    Spelarens .sav pekar ut Palbox och Party exakt; övriga containrar är
    basläger/förvaring och numreras i den ordning de ligger i saven.
    """
    palbox_id = party_id = None
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
            save_data = gvas.properties["SaveData"]["value"]
            palbox_id = _guid(save_data["PalStorageContainerId"]["value"]["ID"])
            party_id = _guid(save_data["OtomoCharacterContainerId"]["value"]["ID"])
            break
        except Exception:
            continue  # kan inte läsa spelarfilen – vi faller tillbaka på storlek

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


def read_save(level_path: Path) -> dict[str, Any]:
    """Läser Level.sav och returnerar pals + spelarnamn i appens format."""
    world = _read_world(
        decompress_sav(level_path),
        {"CharacterSaveParameterMap", "CharacterContainerSaveData"},
    )
    characters = world["CharacterSaveParameterMap"]["value"]
    containers = world["CharacterContainerSaveData"]["value"]
    names = _container_names(containers, level_path.parent)

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

        character_id = _scalar(param.get("CharacterID"), "") or ""
        if not character_id:
            continue

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

        gender_raw = _scalar(param.get("Gender"), "") or ""
        gender = "F" if "Female" in gender_raw else "M" if "Male" in gender_raw else "?"

        slot = param.get("SlotId", {}).get("value", {})
        container_guid = _guid(
            slot.get("ContainerId", {}).get("value", {}).get("ID")
        )
        stomach = _scalar(param.get("FullStomach"))

        pals.append(
            {
                "id": str(_guid(entry["key"]["InstanceId"]) or "")[:8],
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
                "c": names.get(container_guid or "", "Okänd"),
                "slot": int(_scalar(slot.get("SlotIndex"), 0) or 0),
                "nick": _scalar(param.get("NickName"), "") or "",
                "boss": boss,
                "lucky": bool(_scalar(param.get("IsRarePal"), False)),
                "fd": round(stomach) if stomach is not None else None,
                "sn": round(_scalar(param.get("SanityValue"), 100) or 100),
                "xp": int(_scalar(param.get("Exp"), 0) or 0),
            }
        )

    return {"player": player_name, "pals": pals, "containers": sorted(set(names.values()))}


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
