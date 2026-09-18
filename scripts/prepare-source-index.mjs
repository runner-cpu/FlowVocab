import { copyFile } from 'node:fs/promises'

await copyFile('index.src.html', 'index.html')
