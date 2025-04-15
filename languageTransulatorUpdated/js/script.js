const fromText = document.querySelector(".from-text");
const toText = document.querySelector(".to-text");
const exchageIcon = document.querySelector(".exchange");
const selectTags = document.querySelectorAll("select");
const translateBtn = document.getElementById("translate-btn");
const uploadBtn = document.getElementById("upload-btn");
const pdfUpload = document.getElementById("pdf-upload");
const fileName = document.getElementById("file-name");
const downloadPdfBtn = document.getElementById("download-pdf");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

let pdfTextContent = "";
let translatedPdfText = "";
let pdfFile = null;

// Set up language options
selectTags.forEach((tag, id) => {
    for (const country_code in countries) {
        const selected = id === 0 ? 
            (country_code === "en-GB" ? "selected" : "") : 
            (country_code === "hi-IN" ? "selected" : "");
        const option = `<option ${selected} value="${country_code}">${countries[country_code]}</option>`;
        tag.insertAdjacentHTML("beforeend", option);
    }
});

// Language exchange
exchageIcon.addEventListener("click", () => {
    const tempText = fromText.value;
    const tempLang = selectTags[0].value;
    
    fromText.value = toText.value;
    toText.value = tempText;
    selectTags[0].value = selectTags[1].value;
    selectTags[1].value = tempLang;
});

// Clear buttons
document.getElementById("clear-from").addEventListener("click", () => {
    fromText.value = "";
});

document.getElementById("clear-to").addEventListener("click", () => {
    toText.value = "";
});

// Text translation
translateBtn.addEventListener("click", async () => {
    const text = fromText.value.trim();
    const translateFrom = selectTags[0].value;
    const translateTo = selectTags[1].value;
    
    if (!text && !pdfTextContent) {
        alert("Please enter text or upload a PDF file to translate");
        return;
    }

    toText.setAttribute("placeholder", "Translating...");
    toText.value = "";
    
    try {
        // If we have PDF content, translate that
        const contentToTranslate = pdfTextContent || text;
        
        if (contentToTranslate.length > 5000) {
            // For large texts, we'll split and translate in chunks
            await translateLargeText(contentToTranslate, translateFrom, translateTo);
        } else {
            // For small texts, single API call
            const translated = await translateText(contentToTranslate, translateFrom, translateTo);
            toText.value = translated;
        }
        
        if (pdfTextContent) {
            translatedPdfText = toText.value;
            downloadPdfBtn.disabled = false;
        }
    } catch (error) {
        console.error("Translation error:", error);
        toText.value = "Translation failed. Please try again.";
    } finally {
        toText.setAttribute("placeholder", "Translation");
    }
});

async function translateText(text, fromLang, toLang) {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.responseData) {
        return data.responseData.translatedText;
    } else {
        throw new Error(data.responseDetails || "Translation failed");
    }
}

async function translateLargeText(text, fromLang, toLang) {
    const chunkSize = 5000; // API limit per request
    const chunks = [];
    
    // Split text into chunks
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    
    let translatedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
        try {
            const translatedChunk = await translateText(chunks[i], fromLang, toLang);
            translatedChunks.push(translatedChunk);
            
            // Update progress
            const progress = Math.round(((i + 1) / chunks.length) * 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
            // Update the textarea with what we have so far
            toText.value = translatedChunks.join("");
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Error translating chunk ${i + 1}:`, error);
            translatedChunks.push(`[Translation error in chunk ${i + 1}]`);
        }
    }
    
    progressContainer.style.display = "none";
    return translatedChunks.join("");
}

// ... (previous code remains the same until translateText function)

async function translateText(text, fromLang, toLang) {
  // If text is under 500 chars, translate directly
  if (text.length <= 500) {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data.responseData?.translatedText || text;
  }
  
  // For texts over 500 chars, split into chunks
  const chunks = splitTextIntoChunks(text, 450); // 450 to be safe
  let translatedText = "";
  
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  progressText.textContent = "0%";
  
  for (let i = 0; i < chunks.length; i++) {
      try {
          const chunk = chunks[i];
          const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
          const response = await fetch(apiUrl);
          const data = await response.json();
          
          if (data.responseData) {
              translatedText += data.responseData.translatedText + " ";
          } else {
              translatedText += chunk + " "; // Fallback to original if translation fails
          }
          
          // Update progress
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `${progress}%`;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
          console.error(`Error translating chunk ${i + 1}:`, error);
      }
  }
  
  progressContainer.style.display = "none";
  return translatedText;
}

function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/); // Split by sentences
  
  let currentChunk = "";
  for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence;
      } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
      }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// ... (rest of the previous code remains the same)

// PDF handling
uploadBtn.addEventListener("click", () => {
    pdfUpload.click();
});

pdfUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    pdfFile = file;
    fileName.textContent = file.name;
    fromText.value = "";
    toText.value = "";
    downloadPdfBtn.disabled = true;
    
    try {
        fromText.setAttribute("placeholder", "Extracting text from PDF...");
        
        // Extract text from PDF
        pdfTextContent = await extractTextFromPdf(file);
        fromText.value = pdfTextContent;
        
        fromText.setAttribute("placeholder", "Enter text or upload PDF");
    } catch (error) {
        console.error("PDF extraction error:", error);
        fromText.setAttribute("placeholder", "PDF extraction failed");
        fileName.textContent = "Error processing PDF";
    }
});

async function extractTextFromPdf(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = "";
                
                // Extract text from each page
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n\n";
                    
                    // Update progress for large PDFs
                    if (pdf.numPages > 5) {
                        const progress = Math.round((i / pdf.numPages) * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.textContent = `${progress}%`;
                        progressContainer.style.display = "block";
                    }
                }
                
                progressContainer.style.display = "none";
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
}

// Download translated PDF
downloadPdfBtn.addEventListener("click", async () => {
    if (!translatedPdfText || !pdfFile) {
        alert("No translated content available");
        return;
    }
    
    try {
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        
        // In a real implementation, you would use a PDF generation library
        // or API to create a new PDF with the translated text.
        // This is a simplified version that just offers the text as a download.
        
        const blob = new Blob([translatedPdfText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `translated_${pdfFile.name.replace(".pdf", "")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("PDF download error:", error);
        alert("Failed to generate PDF download");
    } finally {
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.innerHTML = '<i class="fas fa-file-download"></i> Download Translated PDF';
    }
});

// Copy and speak functionality
document.querySelectorAll(".icons i").forEach(icon => {
    icon.addEventListener("click", ({ target }) => {
        if (target.classList.contains("fa-copy")) {
            const textToCopy = target.id === "from" ? fromText.value : toText.value;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                showTooltip(target, "Copied!");
            }
        } else if (target.classList.contains("fa-volume-up")) {
            const textToSpeak = target.id === "from" ? fromText.value : toText.value;
            const langCode = target.id === "from" ? selectTags[0].value : selectTags[1].value;
            
            if (textToSpeak) {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = langCode;
                speechSynthesis.speak(utterance);
                showTooltip(target, "Speaking...");
            }
        }
    });
});

function showTooltip(element, message) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = message;
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 30}px`;
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
        tooltip.classList.add("fade-out");
        setTimeout(() => {
            document.body.removeChild(tooltip);
        }, 500);
    }, 1500);
}