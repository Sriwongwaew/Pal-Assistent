/* Ursprungskontrollen framför den lokala servern.
 *
 * Det här är den enda spärren mellan en webbsida användaren råkar besöka och
 * appens API:er, så facit nedan är de två konkreta angreppen skrivna som
 * förfrågningar: en CSRF mot install-rutten (rätt värd, främmande ursprung) och
 * en DNS-rebinding (angriparens värdnamn, inget ursprung alls). Går något av de
 * två testerna igenom som "ok" är spärren borta. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bareHost, checkLocalRequest, isLoopbackHost } from "../src/lib/localOrigin";

describe("bareHost", () => {
  it("skalar bort porten", () => {
    assert.equal(bareHost("127.0.0.1:3123"), "127.0.0.1");
    assert.equal(bareHost("localhost"), "localhost");
  });

  it("tar hakparenteserna först på IPv6", () => {
    // Delar man på första kolon blir värdnamnet "[" och allt IPv6 avvisas.
    assert.equal(bareHost("[::1]:3123"), "[::1]");
    assert.equal(bareHost("[::1]"), "[::1]");
  });

  it("normaliserar versaler och blanktecken", () => {
    assert.equal(bareHost("  LocalHost:3000 "), "localhost");
  });

  it("ger null för tomt och för en ofullständig hakparentes", () => {
    assert.equal(bareHost(""), null);
    assert.equal(bareHost("[::1"), null);
  });
});

describe("isLoopbackHost", () => {
  it("godtar de tre sätten att skriva den här datorn", () => {
    assert.equal(isLoopbackHost("127.0.0.1:3123"), true);
    assert.equal(isLoopbackHost("localhost:3000"), true);
    assert.equal(isLoopbackHost("[::1]:3123"), true);
  });

  it("avvisar allt annat, inklusive saknat huvud", () => {
    assert.equal(isLoopbackHost("angripare.se"), false);
    assert.equal(isLoopbackHost(null), false);
    // Ser ut som loopback men är ett domännamn någon annan äger.
    assert.equal(isLoopbackHost("127.0.0.1.angripare.se"), false);
  });
});

describe("checkLocalRequest", () => {
  it("släpper fram appens egna anrop", () => {
    assert.equal(
      checkLocalRequest({
        host: "127.0.0.1:3123",
        origin: "http://127.0.0.1:3123",
        site: "same-origin",
      }),
      "ok",
    );
  });

  it("släpper fram vanlig navigering, som saknar Origin", () => {
    assert.equal(
      checkLocalRequest({ host: "127.0.0.1:3123", origin: null, site: "none" }),
      "ok",
    );
  });

  it("stoppar CSRF mot install-rutten", () => {
    // En POST med `mode: "no-cors"` från en annan sida: den skickas, svaret är
    // osynligt för angriparen, men effekten hade inträffat utan den här raden.
    assert.equal(
      checkLocalRequest({
        host: "127.0.0.1:3123",
        origin: "https://angripare.se",
        site: "cross-site",
      }),
      "origin",
    );
  });

  it("stoppar DNS-rebinding", () => {
    // IP:t pekar hit, men webbläsaren skickar fortfarande angriparens domän.
    assert.equal(
      checkLocalRequest({ host: "angripare.se", origin: null, site: "none" }),
      "host",
    );
  });

  it("litar inte på Origin: null", () => {
    // Sandlådade iframes skickar det – och det är inte vårt ursprung.
    assert.equal(
      checkLocalRequest({ host: "127.0.0.1:3123", origin: "null", site: null }),
      "origin",
    );
  });

  it("kräver samma port, inte bara samma värd", () => {
    assert.equal(
      checkLocalRequest({
        host: "127.0.0.1:3123",
        origin: "http://127.0.0.1:8080",
        site: null,
      }),
      "origin",
    );
  });

  it("stoppar cross-site GET även utan Origin", () => {
    assert.equal(
      checkLocalRequest({ host: "127.0.0.1:3123", origin: null, site: "cross-site" }),
      "site",
    );
  });

  it("avvisar en förfrågan helt utan Host", () => {
    assert.equal(checkLocalRequest({ host: null, origin: null, site: null }), "host");
  });
});
