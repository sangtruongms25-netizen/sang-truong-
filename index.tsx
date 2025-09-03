/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';
// Fix: Replaced 'emptySafeHtml' with 'EMPTY_HTML' as suggested by the error message.
import { SafeHtml, EMPTY_HTML } from 'safevalues';
import { setElementInnerHtml } from 'safevalues/dom';

const imageUploader = document.getElementById('image-uploader') as HTMLDivElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const uploadPlaceholder = document.getElementById('upload-placeholder') as HTMLDivElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const loadingIndicator = document.getElementById('loading-indicator') as HTMLDivElement;
const loadingMessage = document.getElementById('loading-message') as HTMLParagraphElement;
const resultsGrid = document.getElementById('results-grid') as HTMLDivElement;
const poseSelect = document.getElementById('pose-select') as HTMLSelectElement;
const expressionSelect = document.getElementById('expression-select') as HTMLSelectElement;
const styleSelect = document.getElementById('style-select') as HTMLSelectElement;
const cameraAngleSelect = document.getElementById('camera-angle-select') as HTMLSelectElement;


let uploadedFile: {
  base64: string;
  mimeType: string;
} | null = null;

// Event Listeners for file upload
imageUploader.addEventListener('click', () => fileInput.click());
imageUploader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        fileInput.click();
    }
});
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop listeners
imageUploader.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageUploader.classList.add('dragover');
});
imageUploader.addEventListener('dragleave', () => {
  imageUploader.classList.remove('dragover');
});
imageUploader.addEventListener('drop', (e) => {
  e.preventDefault();
  imageUploader.classList.remove('dragover');
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
});

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64String = (reader.result as string).split(',')[1];
    uploadedFile = {
      base64: base64String,
      mimeType: file.type,
    };
    imagePreview.src = `data:${file.type};base64,${base64String}`;
    imagePreview.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
    generateBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// Main generation logic
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function generateImage(prompt: string): Promise<string | null> {
    if (!uploadedFile) return null;

    const imagePart = {
        inlineData: {
            data: uploadedFile.base64,
            mimeType: uploadedFile.mimeType,
        },
    };
    const textPart = { text: `From the image provided, change the subject to be ${prompt}. It is critical to keep the subject's face and the original background unchanged. Only alter the body's pose and expression.` };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error(`API Error for prompt "${prompt}":`, error);
        // Re-throw the error to be caught by the calling function
        throw error;
    }
}

function createPlaceholder(): HTMLDivElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'result-placeholder';
    return placeholder;
}

function createErrorTile(message: string): HTMLDivElement {
    const errorTile = document.createElement('div');
    errorTile.className = 'result-error';
    errorTile.textContent = message;
    return errorTile;
}

function setControlsDisabled(disabled: boolean) {
    generateBtn.disabled = disabled;
    poseSelect.disabled = disabled;
    expressionSelect.disabled = disabled;
    styleSelect.disabled = disabled;
    cameraAngleSelect.disabled = disabled;
}

generateBtn.addEventListener('click', async () => {
    if (!uploadedFile) {
        alert('Please upload an image first.');
        return;
    }

    setControlsDisabled(true);
    loadingIndicator.classList.remove('hidden');
    loadingMessage.textContent = 'Generating image...';
    setElementInnerHtml(resultsGrid, EMPTY_HTML);

    const placeholder = createPlaceholder();
    resultsGrid.append(placeholder);

    const selectedPose = poseSelect.value;
    const selectedExpression = expressionSelect.value;
    const selectedStyle = styleSelect.value;
    const selectedCameraAngle = cameraAngleSelect.value;

    const combinedPrompt = `${selectedPose}, with ${selectedExpression}, ${selectedStyle}, captured ${selectedCameraAngle}`;

    try {
        const resultSrc = await generateImage(combinedPrompt);
        if (resultSrc) {
            const container = document.createElement('div');
            container.className = 'result-container';

            const img = document.createElement('img');
            img.src = resultSrc;
            img.alt = `Generated image: ${combinedPrompt}`;
            img.className = 'result-image';

            const downloadBtn = document.createElement('a');
            downloadBtn.href = resultSrc;
            const cleanPrompt = combinedPrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            downloadBtn.download = `generated_${cleanPrompt}.png`;
            downloadBtn.className = 'download-btn';
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'currentColor');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z');
            svg.appendChild(path);
            
            const downloadText = document.createElement('span');
            downloadText.textContent = 'Download';

            downloadBtn.appendChild(svg);
            downloadBtn.appendChild(downloadText);

            container.appendChild(img);
            container.appendChild(downloadBtn);

            img.onload = () => {
                if (resultsGrid.contains(placeholder)) {
                   resultsGrid.replaceChild(container, placeholder);
                }
            };
            img.onerror = () => {
               if (resultsGrid.contains(placeholder)) {
                   resultsGrid.replaceChild(createErrorTile('Failed to load image.'), placeholder);
               }
            };
        } else {
             if (resultsGrid.contains(placeholder)) {
                resultsGrid.replaceChild(createErrorTile('Generation failed.'), placeholder);
            }
        }
    } catch (error) {
         if (resultsGrid.contains(placeholder)) {
            resultsGrid.replaceChild(createErrorTile('API error.'), placeholder);
        }
    }
    
    loadingIndicator.classList.add('hidden');
    setControlsDisabled(false);
});