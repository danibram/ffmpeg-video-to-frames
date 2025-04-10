export const blobDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const fileToBlobDownload = (
  data: Uint8Array | string,
  fileName: string,
  fileType = 'video/mp4',
  extension = 'mp4',
) => {
  const blob = new Blob([data], { type: fileType });
  blobDownload(blob, `${fileName.split('.')[0]}_${extension}`);
};
