import fs from 'fs';
import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import { JSDOM } from 'jsdom';
import htmlToPdfMake from 'html-to-pdfmake';

pdfMake.vfs = pdfFonts.vfs;

export async function handleGeneratePDFs(combinedHTML) {
    // Function to convert HTML to PDF
    const createPdf = async (htmlContent, outputPath) => {
      const { window } = new JSDOM('');
      const pdfContent = htmlToPdfMake(htmlContent, { window });
  
      const docDefinition = {
        content: pdfContent,
        pageSize: 'LETTER',
        pageMargins: [40, 60, 40, 60], // left, top, right, bottom
      };
  
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBuffer((buffer) => {
        fs.writeFileSync(outputPath, buffer);
      });
    };
  
    // Generate PDFs
    await createPdf(combinedHTML, './QuestionPaper.pdf');
    await createPdf(AnswerSheet, './AnswerSheet.pdf');
  
    return { message: 'PDFs generated successfully.' };
  }