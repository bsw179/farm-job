import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDFfromElement = async (element, filename = 'report.pdf') => {
  if (!element) {
    alert('PDF export failed: report element not found.');
    return;
  }

  const canvas = await html2canvas(element, {
  ignoreElements: (el) => el.classList?.contains('no-print')
});

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'pt', 'a4');

  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, width, height);
  pdf.save(filename);
};
