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
  const pasteContainer = document.getElementById('paste-container');
  const pastedImage = document.getElementById('pasted-image');
  const processClipboardButton = document.getElementById('process-clipboard');
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

  let currentTokens = [];
  let clipboardImage = null;

  // Fetch and display tokens
  fetchTokens();

  // Initialize Sortable.js for drag and drop reordering
  const sortable = new Sortable(tokenList, {
    handle: '.list-item-drag-handle',
    animation: 150,
    onEnd: handleReorder
  });

  // Event listeners
  addTokenForm.addEventListener('submit', handleTokenSubmit);
  tabButtons.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  qrFileInput.addEventListener('change', handleQrFileUpload);
  processClipboardButton.addEventListener('click', processClipboardImage);
  addQrTokenButton.addEventListener('click', handleQrTokenSubmit);
  modalCloseButtons.forEach(btn => btn.addEventListener('click', () => closeModal(secretModal)));
  modalCopySecretButton.addEventListener('click', copySecretToClipboard);

  // Setup paste event listeners
  document.addEventListener('paste', handlePaste);
  pasteContainer.addEventListener('click', function() {
    // Create a temporary input element to trigger the paste dialog
    const temp = document.createElement('input');
    document.body.appendChild(temp);
    temp.focus();
    document.body.removeChild(temp);
  });

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
      emptyMessage.textContent = '尚无验证码，请使用上方表单添加2FA验证码。';
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
    resetPasteArea();
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
        throw new Error('添加验证码失败');
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
    .catch(error => console.error('添加验证码出错:', error));
  }

  function handleTokenListClick(e) {
    const deleteBtn = e.target.closest('.delete-token-btn');
    if (deleteBtn) {
      const listItem = deleteBtn.closest('.list-item');
      const tokenId = listItem.dataset.id;
      
      if (confirm('您确定要删除此验证码吗？')) {
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
        throw new Error('删除验证码失败');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        fetchTokens();
      }
    })
    .catch(error => console.error('删除验证码出错:', error));
  }

  function showSecret(id) {
    fetch(`/api/2fa/${id}/secret`)
      .then(response => {
        if (!response.ok) {
          throw new Error('获取密钥失败');
        }
        return response.json();
      })
      .then(data => {
        modalSecretText.textContent = data.secret;
        modalQrCode.src = data.qrCode;
        openModal(secretModal);
      })
      .catch(error => console.error('获取密钥出错:', error));
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
        throw new Error('修改验证码排序失败');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        fetchTokens();
      }
    })
    .catch(error => console.error('修改验证码排序出错:', error));
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

  function handlePaste(e) {
    // Check if we're in the QR code tab
    const qrcodeTab = document.querySelector('.tab-content#qrcode.active');
    if (!qrcodeTab) return;
    
    // Get clipboard items
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        
        reader.onload = function(event) {
          // Display the pasted image
          pastedImage.src = event.target.result;
          pastedImage.style.display = 'block';
          pasteContainer.classList.add('has-image');
          clipboardImage = event.target.result;
        };
        
        reader.readAsDataURL(blob);
        break;
      }
    }
  }
  
  function processClipboardImage() {
    if (!clipboardImage) {
      alert('请先点击上方区域并粘贴图片(Ctrl+V 或 ⌘+V）');
      return;
    }
    
    processQrCodeImage(clipboardImage);
  }

  function resetPasteArea() {
    pastedImage.src = '';
    pastedImage.style.display = 'none';
    pasteContainer.classList.remove('has-image');
    clipboardImage = null;
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
        alert('图片中未找到二维码。请重试。');
      }
    };
    image.src = imageUrl;
  }

  function processQrCodeResult(data) {
    try {
      // Try to parse the otpauth URL
      const url = new URL(data);
      if (url.protocol !== 'otpauth:') {
        throw new Error('无效的otpauth网址');
      }
      
      // Extract the secret
      const params = new URLSearchParams(url.search);
      const secret = params.get('secret');
      
      if (!secret) {
        throw new Error('未在二维码中解析到密钥');
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
      alert('无效的二维码，请提供有效的2FA二维码');
    }
  }

  function copySecretToClipboard() {
    const secret = modalSecretText.textContent;
    navigator.clipboard.writeText(secret)
      .then(() => {
        const originalText = modalCopySecretButton.textContent;
        modalCopySecretButton.textContent = '已复制！';
        setTimeout(() => {
          modalCopySecretButton.textContent = originalText;
        }, 2000);
      })
      .catch(err => console.error('复制失败:', err));
  }

  function openModal(modal) {
    modal.classList.add('show');
  }

  function closeModal(modal) {
    modal.classList.remove('show');
  }

  function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
      element.classList.remove('shake');
    }, 500);
  }
}); 