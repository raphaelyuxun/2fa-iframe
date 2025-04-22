document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const tokenList = document.getElementById('token-list');
  const addTokenForm = document.getElementById('add-token-form');
  const tokenNameInput = document.getElementById('token-name');
  const tokenNoteInput = document.getElementById('token-note');
  const tokenSecretInput = document.getElementById('token-secret');
  const tabButtons = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const qrFileInput = document.getElementById('qr-file');
  const captureScreenButton = document.getElementById('capture-screen');
  const qrResultContainer = document.getElementById('qr-result-container');
  const qrTokenNameInput = document.getElementById('qr-token-name');
  const qrTokenNoteInput = document.getElementById('qr-token-note');
  const qrTokenSecretDisplay = document.getElementById('qr-token-secret');
  const addQrTokenButton = document.getElementById('add-qr-token');
  const secretModal = document.getElementById('secret-modal');
  const modalSecretText = document.getElementById('modal-secret-text');
  const modalQrCode = document.getElementById('modal-qr-code');
  const modalCloseButtons = document.querySelectorAll('#close-modal, #modal-close');
  const modalCopySecretButton = document.getElementById('modal-copy-secret');
  const scannerModal = document.getElementById('scanner-modal');
  const screenshotContainer = document.getElementById('screenshot-container');
  const selectionArea = document.getElementById('selection-area');
  const closeScannerModalButton = document.getElementById('close-scanner-modal');
  const cancelScreenshotButton = document.getElementById('cancel-screenshot');
  const captureSelectionButton = document.getElementById('capture-selection');

  let currentTokens = [];
  let draggedItem = null;
  let isSelecting = false;
  let selectionStart = { x: 0, y: 0 };
  let selectionEnd = { x: 0, y: 0 };
  let screenshotImage = null;

  // Fetch and display tokens
  fetchTokens();

  // Initialize Sortable.js for drag and drop reordering
  const sortable = new Sortable(tokenList, {
    handle: '.list-item-drag-handle',
    animation: 150,
    onEnd: handleReorder
  });

  // Add ripple effect to buttons
  document.addEventListener('click', function(e) {
    if (e.target.closest('.btn')) {
      createRipple(e);
    }
  });

  // Event listeners
  addTokenForm.addEventListener('submit', handleTokenSubmit);
  tabButtons.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  qrFileInput.addEventListener('change', handleQrFileUpload);
  captureScreenButton.addEventListener('click', openScreenshotModal);
  addQrTokenButton.addEventListener('click', handleQrTokenSubmit);
  modalCloseButtons.forEach(btn => btn.addEventListener('click', () => closeModal(secretModal)));
  modalCopySecretButton.addEventListener('click', copySecretToClipboard);
  closeScannerModalButton.addEventListener('click', () => closeModal(scannerModal));
  cancelScreenshotButton.addEventListener('click', () => closeModal(scannerModal));
  captureSelectionButton.addEventListener('click', processScreenshotSelection);

  // Event delegation for token list interactions
  tokenList.addEventListener('click', handleTokenListClick);
  tokenList.addEventListener('blur', handleContentEditableBlur, true);

  // Functions
  function fetchTokens() {
    fetch('/api/2fa')
      .then(response => response.json())
      .then(data => {
        currentTokens = data.items;
        renderTokenList();
      })
      .catch(error => console.error('Error fetching tokens:', error));
  }

  function renderTokenList() {
    tokenList.innerHTML = '';
    
    // Sort by order property
    const sortedTokens = [...currentTokens].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    if (sortedTokens.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'list-item';
      emptyMessage.textContent = 'No tokens added yet. Use the form above to add your first 2FA token.';
      tokenList.appendChild(emptyMessage);
      return;
    }
    
    sortedTokens.forEach(token => {
      const template = document.getElementById('token-item-template');
      const tokenItem = document.importNode(template.content, true);
      
      const listItem = tokenItem.querySelector('.list-item');
      listItem.dataset.id = token.id;
      
      const nameSpan = tokenItem.querySelector('.otp-name .editable');
      nameSpan.textContent = token.name;
      nameSpan.dataset.field = 'name';
      nameSpan.dataset.id = token.id;
      
      const noteSpan = tokenItem.querySelector('.otp-note .editable');
      noteSpan.textContent = token.note || '';
      noteSpan.dataset.field = 'note';
      noteSpan.dataset.id = token.id;
      
      tokenList.appendChild(tokenItem);
    });
  }

  function handleTokenSubmit(e) {
    e.preventDefault();
    
    const name = tokenNameInput.value.trim();
    const note = tokenNoteInput.value.trim();
    const secret = tokenSecretInput.value.trim().replace(/\s+/g, '');
    
    if (!name || !secret) {
      shakeElement(e.submitter);
      return;
    }
    
    addToken(name, note, secret);
  }

  function handleQrTokenSubmit() {
    const name = qrTokenNameInput.value.trim();
    const note = qrTokenNoteInput.value.trim();
    const secret = qrTokenSecretDisplay.textContent.trim();
    
    if (!name || !secret) {
      shakeElement(addQrTokenButton);
      return;
    }
    
    addToken(name, note, secret);
    
    // Reset QR fields
    qrTokenNameInput.value = '';
    qrTokenNoteInput.value = '';
    qrTokenSecretDisplay.textContent = '';
    qrResultContainer.style.display = 'none';
    switchTab('manual');
  }

  function addToken(name, note, secret) {
    fetch('/api/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, note, secret })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to add token');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Reset form
        tokenNameInput.value = '';
        tokenNoteInput.value = '';
        tokenSecretInput.value = '';
        
        // Refresh tokens
        fetchTokens();
      }
    })
    .catch(error => console.error('Error adding token:', error));
  }

  function handleTokenListClick(e) {
    const deleteBtn = e.target.closest('.delete-token-btn');
    if (deleteBtn) {
      const listItem = deleteBtn.closest('.list-item');
      const tokenId = listItem.dataset.id;
      
      if (confirm('Are you sure you want to delete this token?')) {
        deleteToken(tokenId);
      }
      
      return;
    }
    
    const showSecretBtn = e.target.closest('.show-secret-btn');
    if (showSecretBtn) {
      const listItem = showSecretBtn.closest('.list-item');
      const tokenId = listItem.dataset.id;
      
      showSecret(tokenId);
      
      return;
    }
  }

  function deleteToken(id) {
    fetch(`/api/2fa/${id}`, {
      method: 'DELETE'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to delete token');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        fetchTokens();
      }
    })
    .catch(error => console.error('Error deleting token:', error));
  }

  function showSecret(id) {
    fetch(`/api/2fa/${id}/secret`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch secret');
        }
        return response.json();
      })
      .then(data => {
        modalSecretText.textContent = data.secret;
        modalQrCode.src = data.qrCode;
        openModal(secretModal);
      })
      .catch(error => console.error('Error fetching secret:', error));
  }

  function handleContentEditableBlur(e) {
    if (!e.target.classList.contains('editable')) return;
    
    const field = e.target.dataset.field;
    const id = e.target.dataset.id;
    const value = e.target.textContent.trim();
    
    updateToken(id, field, value);
  }

  function updateToken(id, field, value) {
    // Find the token in the current tokens array
    const token = currentTokens.find(t => t.id === id);
    if (!token || token[field] === value) return;
    
    // Update the token locally first
    token[field] = value;
    
    // Then send the update to the server
    const updateData = {};
    updateData[field] = value;
    
    fetch(`/api/2fa/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to update token ${field}`);
      }
      return response.json();
    })
    .catch(error => console.error(`Error updating token ${field}:`, error));
  }

  function handleReorder(evt) {
    const items = Array.from(tokenList.querySelectorAll('.list-item')).map((item, index) => ({
      id: item.dataset.id,
      order: index
    }));
    
    fetch('/api/2fa/reorder', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to reorder tokens');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        fetchTokens();
      }
    })
    .catch(error => console.error('Error reordering tokens:', error));
  }

  function switchTab(tabId) {
    // Update tab buttons
    tabButtons.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update tab contents
    tabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  function handleQrFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      processQrCodeImage(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  function processQrCodeImage(imageUrl) {
    const image = new Image();
    image.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        processQrCodeResult(code.data);
      } else {
        alert('No QR code found in the image. Please try again.');
      }
    };
    image.src = imageUrl;
  }

  function processQrCodeResult(data) {
    try {
      // Try to parse the otpauth URL
      const url = new URL(data);
      if (url.protocol !== 'otpauth:') {
        throw new Error('Not a valid otpauth URL');
      }
      
      // Extract the secret
      const params = new URLSearchParams(url.search);
      const secret = params.get('secret');
      
      if (!secret) {
        throw new Error('No secret found in the QR code');
      }
      
      // Extract the name
      let name = '';
      if (url.pathname.startsWith('//totp/')) {
        name = decodeURIComponent(url.pathname.substring(7));
      }
      
      // Show the result form
      qrTokenSecretDisplay.textContent = secret;
      qrTokenNameInput.value = name;
      qrResultContainer.style.display = 'block';
    } catch (error) {
      console.error('Error processing QR code:', error);
      alert('Invalid QR code. Please make sure it\'s a valid 2FA QR code.');
    }
  }

  function openScreenshotModal() {
    // Take a screenshot of the current page
    html2canvas(document.body).then(canvas => {
      screenshotImage = canvas;
      
      // Clear previous screenshot
      screenshotContainer.innerHTML = '';
      screenshotContainer.appendChild(canvas);
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      
      // Setup selection events
      setupScreenshotSelection(canvas);
      
      // Show the modal
      openModal(scannerModal);
    });
  }

  function setupScreenshotSelection(canvas) {
    canvas.addEventListener('mousedown', startSelection);
    canvas.addEventListener('mousemove', updateSelection);
    canvas.addEventListener('mouseup', endSelection);
  }

  function startSelection(e) {
    isSelecting = true;
    
    // Calculate position relative to the canvas
    const rect = e.target.getBoundingClientRect();
    selectionStart.x = e.clientX - rect.left;
    selectionStart.y = e.clientY - rect.top;
    
    // Reset selection area
    selectionArea.style.left = `${selectionStart.x}px`;
    selectionArea.style.top = `${selectionStart.y}px`;
    selectionArea.style.width = '0px';
    selectionArea.style.height = '0px';
    selectionArea.style.display = 'block';
  }

  function updateSelection(e) {
    if (!isSelecting) return;
    
    // Calculate position relative to the canvas
    const rect = e.target.getBoundingClientRect();
    selectionEnd.x = e.clientX - rect.left;
    selectionEnd.y = e.clientY - rect.top;
    
    // Calculate dimensions
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    // Calculate top-left corner
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    
    // Update selection area
    selectionArea.style.left = `${left}px`;
    selectionArea.style.top = `${top}px`;
    selectionArea.style.width = `${width}px`;
    selectionArea.style.height = `${height}px`;
  }

  function endSelection() {
    isSelecting = false;
  }

  function processScreenshotSelection() {
    if (!screenshotImage) return;
    
    // Get the selection coordinates
    const left = parseInt(selectionArea.style.left);
    const top = parseInt(selectionArea.style.top);
    const width = parseInt(selectionArea.style.width);
    const height = parseInt(selectionArea.style.height);
    
    // Check if selection is valid
    if (width < 50 || height < 50) {
      alert('Selection area is too small. Please select a larger area.');
      return;
    }
    
    // Create a canvas for the selected region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(
      screenshotImage,
      left, top, width, height,
      0, 0, width, height
    );
    
    // Process the selected area as a QR code
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      processQrCodeResult(code.data);
      closeModal(scannerModal);
    } else {
      alert('No QR code found in the selected area. Please try again.');
    }
  }

  function copySecretToClipboard() {
    const secret = modalSecretText.textContent;
    navigator.clipboard.writeText(secret)
      .then(() => {
        const originalText = modalCopySecretButton.textContent;
        modalCopySecretButton.textContent = 'Copied!';
        setTimeout(() => {
          modalCopySecretButton.textContent = originalText;
        }, 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  }

  function openModal(modal) {
    modal.classList.add('show');
  }

  function closeModal(modal) {
    modal.classList.remove('show');
  }

  function createRipple(event) {
    const button = event.target.closest('.btn');
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const ripple = button.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }
    
    button.appendChild(circle);
  }

  function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
      element.classList.remove('shake');
    }, 500);
  }
}); 