import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generateHtmlPDFBlob = async (element, options = {}) => {
  const { title = "", scale = 1.25 } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#fff",
  });

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = pageWidth / canvas.width;
  const imgHeight = canvas.height * ratio;

  let position = 0;

  while (position < canvas.height) {
    const sliceHeight = Math.min(canvas.height - position, pageHeight / ratio);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(
      canvas,
      0,
      position,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    );

    const imgData = pageCanvas.toDataURL("image/png");
    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      pageWidth,
      sliceHeight * ratio,
      undefined,
      "FAST"
    );

    position += sliceHeight;
    if (position < canvas.height) pdf.addPage();
  }

  if (title) pdf.setProperties({ title });

  return pdf.output("blob");
};
