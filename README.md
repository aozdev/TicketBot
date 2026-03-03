# TicketBot (Discord.js v14)

Discord.js v14 ile hazırlanmış, **butonlardan oluşan** ve **.env üzerinden özelleştirilebilir embed** paneli sunan örnek bot.

## Özellikler
- `/panel` slash komutu ile embed + buton paneli gönderme
- 3 buton: Ticket Aç, Bilgi, Ticket Kapat
- Embed başlık, açıklama, renk, footer ve thumbnail özelleştirme
- Buton label/style/emoji özelleştirme
- `Ticket Kapat` butonunda yetki kontrolü (`ManageChannels`)

## Kurulum
```bash
npm install
cp .env.example .env
```

`.env` dosyasına token ve kimlik bilgilerini gir:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`

## Slash komutunu sunucuya kaydetme
```bash
node src/register-commands.js
```

## Botu çalıştırma
```bash
npm start
```

## Özelleştirme
Aşağıdaki alanları `.env` dosyasından değiştirebilirsin:
- `EMBED_TITLE`, `EMBED_DESCRIPTION`, `EMBED_COLOR`, `EMBED_THUMBNAIL`, `EMBED_FOOTER`
- `BUTTON_OPEN_*`, `BUTTON_INFO_*`, `BUTTON_CLOSE_*`

Buton stilleri için geçerli değerler:
- `Primary`
- `Secondary`
- `Success`
- `Danger`
