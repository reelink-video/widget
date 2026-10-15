# Reelink widget

Widget, který na produktových stránkách e-shopu ukazuje krátká vertikální videa. Vkládá se jedním řádkem kódu:

```html
<script async src="https://cdn.reelink.cz/widget.js" data-shop="VAS-KOD"></script>
```

Kód je veřejný, abyste si mohli sami ověřit, co na vašem webu běží. Víc na [reelink.cz/bezpecnost](https://reelink.cz/bezpecnost).

## Co widget dělá

- čte ze stránky název, cenu, fotku a zvolenou variantu produktu,
- ukáže pod cenou videa a po kliknutí zmáčkne vaše tlačítko „Do košíku“,
- posílá souhrnné události (zobrazení, přehrání, klik) bez ID návštěvníka,
- neukládá cookies ani nic jiného do prohlížeče, nečte formuláře ani údaje zákazníků.

Nemá žádné runtime závislosti, do prohlížeče jde jen kód z `src/`.

## Kontroly každé verze

Než verze vyjde, musí projít (`.github/workflows/checks.yml`):

- **CodeQL** se sadou `security-extended`,
- **Semgrep** s pravidly pro JavaScript a TypeScript,
- kontrolou, že `package.json` nemá runtime závislosti,
- kontrolou typů.

Vydanou verzi podepíše GitHub Actions (build provenance přes Sigstore). Seznam verzí s hashi je na
[cdn.reelink.cz/versions.json](https://cdn.reelink.cz/versions.json).

## Jak ověřit soubor

Podpis: soubor pochází z tohoto repozitáře a od sestavení se nezměnil.

```sh
curl -sO https://cdn.reelink.cz/widget@1.0.0.js
gh attestation verify widget@1.0.0.js --repo reelink-video/widget
```

Hash, který porovnáte s `versions.json` nebo s vydáním na GitHubu:

```sh
echo "sha384-$(openssl dgst -sha384 -binary widget@1.0.0.js | openssl base64 -A)"
```

Sestavení si můžete zopakovat sami a výsledek by měl mít stejný hash:

```sh
git checkout v1.0.0 && npm ci && npm run build
```

## Pevná verze s integrity

Kdo nechce automatické aktualizace, vloží konkrétní verzi s hashem. Prohlížeč pak soubor nespustí, pokud by se
změnil byť o jeden znak:

```html
<script async src="https://cdn.reelink.cz/widget@1.0.0.js"
  integrity="sha384-…" crossorigin="anonymous" data-shop="VAS-KOD"></script>
```

Přesný řádek s hashem je u každého vydání.

## Vývoj

```sh
npm ci
npm run dev     # http://localhost:4400
npm run check
npm run build   # dist/widget.js
```

Vydání: zvyšte `version` v `package.json`, pak `git tag v1.2.3 && git push --tags`.

## Bezpečnostní problém

Viz [SECURITY.md](SECURITY.md).
