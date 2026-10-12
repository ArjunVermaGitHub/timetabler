import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/** Web downloads don't work inside a WebView: the page hands over the PDF to save and share. */
export async function savePdf(fileName, base64) {
  const safeName = String(fileName || 'timetable.pdf').replace(/[^\w.-]+/g, '-')
  const file = new File(Paths.cache, safeName)
  if (file.exists) file.delete()
  file.create()
  file.write(base64, { encoding: 'base64' })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or share the timetable',
    })
  }
}
