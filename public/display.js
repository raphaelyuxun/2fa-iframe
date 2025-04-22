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
        otpList.innerHTML = '<li class="otp-item">获取2FA验证码出错，请刷新页面。</li>';
      });
  }
  
  function renderOtpList(otps) {
    otpList.innerHTML = '';
    
    if (otps.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'otp-item';
      emptyMessage.textContent = '尚无验证码，请前往配置看板添加2FA验证码。';
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
      copyToClipboard(token, copyBtn);
      return;
    }
  }
  
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Add animation to the button
        button.classList.add('copy-animation');
        setTimeout(() => {
          button.classList.remove('copy-animation');
        }, 500);
      })
      .catch(err => console.error('复制失败:', err));
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