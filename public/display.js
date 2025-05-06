document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const otpList = document.getElementById('otp-list');
  const timerValue = document.getElementById('timer-value');
  
  let otpRefreshInterval = null;
  let remainingSeconds = 30;
  
  // Fetch and display OTPs initially
  fetchOTPs();
  
  // Add ripple effect to buttons
  document.addEventListener('click', function(e) {
    if (e.target.closest('.btn')) {
      createRipple(e);
    }
  });
  
  // Event delegation for OTP list interactions
  otpList.addEventListener('click', handleOtpListClick);
  
  // Functions
  function fetchOTPs() {
    fetch('/api/2fa/otps')
      .then(response => response.json())
      .then(data => {
        renderOtpList(data.otps);
        
        // Set the timer
        remainingSeconds = data.remainingSeconds;
        updateTimer();
        
        // If there's an existing timer, clear it
        if (otpRefreshInterval) {
          clearInterval(otpRefreshInterval);
        }
        
        // Set timer to update countdown every second
        otpRefreshInterval = setInterval(() => {
          remainingSeconds--;
          updateTimer();
          
          if (remainingSeconds <= 0) {
            fetchOTPs();
          }
        }, 1000);
      })
      .catch(error => {
        console.error('Error fetching OTPs:', error);
        otpList.innerHTML = '<li class="otp-item">获取&#8201;2FA&#8201;验证码出错，请刷新页面。</li>';
      });
  }
  
  function renderOtpList(otps) {
    otpList.innerHTML = '';
    
    if (otps.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'otp-item';
      emptyMessage.textContent = '尚无验证码，请前往配置看板添加&#8201;2FA&#8201;验证码。';
      otpList.appendChild(emptyMessage);
      return;
    }
    
    otps.forEach(otp => {
      const template = document.getElementById('otp-item-template');
      const otpItem = document.importNode(template.content, true);
      
      const listItem = otpItem.querySelector('.otp-item');
      listItem.dataset.id = otp.id;
      
      const nameElement = otpItem.querySelector('.otp-name');
      nameElement.textContent = otp.name;
      
      const noteElement = otpItem.querySelector('.otp-note');
      noteElement.textContent = otp.note || '';
      
      const tokenElement = otpItem.querySelector('.token');
      tokenElement.textContent = formatToken(otp.token);
      
      const copyButton = otpItem.querySelector('.copy-otp-btn');
      copyButton.dataset.token = otp.token;
      
      const btnText = copyButton.querySelector('.copy-btn-text');
      btnText.dataset.originalText = btnText.textContent;
      
      // 添加鼠标移出事件监听
      copyButton.addEventListener('mouseleave', function() {
        resetButtonState(this);
      });
      
      otpList.appendChild(otpItem);
    });
  }
  
  function formatToken(token) {
    // Format token with a space in the middle (e.g., "123 456")
    if (token.length === 6) {
      return `${token.substring(0, 3)} ${token.substring(3)}`;
    }
    return token;
  }
  
  function handleOtpListClick(e) {
    const copyBtn = e.target.closest('.copy-otp-btn');
    if (copyBtn) {
      const token = copyBtn.dataset.token;
      copyToClipboard(token, copyBtn, e);
      return;
    }
  }
  
  function copyToClipboard(text, button, event) {
    navigator.clipboard.writeText(text)
      .then(() => {
        // 创建扩散动效
        createButtonRippleEffect(button, event);
        
        // 修改按钮文字和样式
        const btnText = button.querySelector('.copy-btn-text');
        const icon = button.querySelector('.material-icons');
        
        // 保存原始状态
        const originalText = btnText.textContent;
        const originalIcon = icon.textContent;
        
        // 更新按钮状态
        btnText.textContent = '已复制！';
        icon.textContent = 'check';
        button.style.backgroundColor = 'var(--primary-color)';
        button.style.color = 'white';
        
        // 3秒后恢复原始状态
        setTimeout(() => {
          resetButtonState(button, originalText, originalIcon);
        }, 3000);
      })
      .catch(err => {
        console.error('复制失败:', err);
        // 显示错误状态
        const btnText = button.querySelector('.copy-btn-text');
        btnText.textContent = '复制失败';
        button.style.backgroundColor = 'var(--error-color)';
        button.style.color = 'white';
        
        // 2秒后恢复原始状态
        setTimeout(() => {
          resetButtonState(button);
        }, 2000);
      });
  }
  
  function createButtonRippleEffect(button, event) {
    // 删除已有的波纹
    const oldRipple = button.querySelector('.btn-ripple-effect');
    if (oldRipple) {
      oldRipple.remove();
    }
    
    // 创建新波纹
    const ripple = document.createElement('span');
    ripple.classList.add('btn-ripple-effect');
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - (size / 2)}px`;
    ripple.style.top = `${event.clientY - rect.top - (size / 2)}px`;
    
    button.appendChild(ripple);
    
    // 开始动画
    requestAnimationFrame(() => {
      ripple.style.animation = 'ripple-expand 0.6s ease-out forwards';
    });
  }
  
  function resetButtonState(button, originalText, originalIcon) {
    // 恢复按钮样式
    button.style.backgroundColor = '';
    button.style.color = '';
    
    // 恢复按钮文字
    const btnText = button.querySelector('.copy-btn-text');
    if (originalText) {
      btnText.textContent = originalText;
    } else {
      btnText.textContent = '复制验证码';
    }
    
    // 恢复图标
    const icon = button.querySelector('.material-icons');
    if (originalIcon) {
      icon.textContent = originalIcon;
    } else {
      icon.textContent = 'content_copy';
    }
    
    // 删除波纹效果
    const ripple = button.querySelector('.btn-ripple-effect');
    if (ripple) {
      ripple.style.animation = 'ripple-fade 0.3s ease-out forwards';
      setTimeout(() => {
        ripple.remove();
      }, 300);
    }
  }
  
  function updateTimer() {
    timerValue.textContent = remainingSeconds;
    
    // Update the timer appearance based on remaining time
    const timerElement = timerValue.closest('.timer');
    
    if (remainingSeconds <= 5) {
      timerElement.style.backgroundColor = '#ea4335'; // Red color when almost expired
    } else if (remainingSeconds <= 10) {
      timerElement.style.backgroundColor = '#fbbc05'; // Yellow/amber when getting close
    } else {
      timerElement.style.backgroundColor = '#1a73e8'; // Default blue
    }
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
}); 