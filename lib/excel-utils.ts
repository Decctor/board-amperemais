import * as XLSX from 'xlsx'
export const getJSONFromExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result as string
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => reject(error)

    reader.readAsBinaryString(file)
  })
}
export const getExcelFromJSON = (jsonData: any[], fileName: string): void => {
  const worksheet = XLSX.utils.json_to_sheet(jsonData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet 1')

  const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  // Create a Blob containing the Excel file
  const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  // Create a download link and trigger a click event to download the file
  const downloadLink = document.createElement('a')
  downloadLink.href = URL.createObjectURL(blob)
  downloadLink.download = fileName
  downloadLink.click()
}
export function getFixedDateFromExcel(date: number) {
  return new Date(Math.round((date - 25569) * 86400 * 1000))
}
