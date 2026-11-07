# Adhan recordings (not included)

Adhan recordings are copyrighted, so they are not part of this repository.
Put your own MP3 files here before building — one per prayer:

| File | Prayer | Traditional Turkish makam |
|---|---|---|
| `ezan-fajr.mp3` | Fajr / Sabah | Saba |
| `ezan-dhuhr.mp3` | Dhuhr / Öğle (also Jumu'ah) | Uşşak |
| `ezan-asr.mp3` | Asr / İkindi | Rast |
| `ezan-maghrib.mp3` | Maghrib / Akşam | Segâh |
| `ezan-isha.mp3` | Isha / Yatsı | Hicaz |

`npm run package` bundles them into the app (loudness-normalised with ffmpeg if available).
Missing files fall back to an online adhan (assabile.com) or the built-in chime.
You can also upload them later with webOS Dev Manager → Files →
`/media/developer/apps/usr/palm/applications/com.noor.webos/audio/`.
