export const fileToBlobDownload = (data: Uint8Array | string, fileName: string, fileType: string = 'video/mp4', extension: string = 'mp4') => {
    const blob = new Blob([data], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}_${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};