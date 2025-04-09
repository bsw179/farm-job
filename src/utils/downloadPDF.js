import { pdf } from '@react-pdf/renderer';
import { generatePDF } from './generatePDF';

export const downloadJobPDF = async (job) => {
  try {
    console.log('🧾 Generating PDF for job:', job); // 👈 Logs job to console
    const blob = await pdf(generatePDF({ job })).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JobOrder_${job.jobType}_${job.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
} catch (err) {
    console.error('❌ PDF generation error:', JSON.stringify(err, null, 2)); // <-- stringify the error
    alert('Something went wrong while generating the PDF.');
  }
};
