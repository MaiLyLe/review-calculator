// Simple Rating Calculator Popup - No Event Conflicts
(function() {
  'use strict';
  
  let currentPopup = null;
  let isClosing = false;
  
  function createPopup(options = {}) {
    // Prevent multiple popups
    if (currentPopup) {
      closePopup();
    }
    
    const appUrl = options.appUrl || 'http://localhost:3001';
    const animation = options.animation || 'slideUp';
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 90%;
      max-width: 600px;
      height: 80%;
      max-height: 800px;
      background: rgb(28, 32, 36);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
      transform: ${animation === 'slideUp' ? 'translateY(100%)' : 'scale(0.5)'};
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: ${animation === 'fadeScale' ? '0' : '1'};
    `;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      width: 32px;
      height: 32px;
      background: rgba(252, 252, 253, 0.1);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: rgb(252, 252, 253);
      z-index: 1;
      transition: all 0.2s ease;
    `;
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = appUrl;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    `;
    
    // Assemble
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    // Store reference
    currentPopup = {
      backdrop: backdrop,
      modal: modal,
      closeBtn: closeBtn
    };
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Single close function
    function doClose() {
      if (isClosing || !currentPopup) return;
      isClosing = true;
      
      backdrop.style.opacity = '0';
      modal.style.transform = animation === 'slideUp' ? 'translateY(100%)' : 'scale(0.5)';
      if (animation === 'fadeScale') {
        modal.style.opacity = '0';
      }
      
      setTimeout(() => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
        currentPopup = null;
        isClosing = false;
        document.body.style.overflow = '';
      }, 400);
    }
    
    // Event listeners with immediate binding
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      doClose();
    });
    
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        doClose();
      }
    });
    
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && currentPopup) {
        document.removeEventListener('keydown', escHandler);
        doClose();
      }
    });
    
    // Animate in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.transform = 'translateY(0) scale(1)';
      if (animation === 'fadeScale') {
        modal.style.opacity = '1';
      }
    });
    
    // Hover effect for close button
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(252, 252, 253, 0.2)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(252, 252, 253, 0.1)';
    });
  }
  
  function closePopup() {
    if (currentPopup && currentPopup.closeBtn) {
      currentPopup.closeBtn.click();
    }
  }
  
  // Global API
  window.RatingPopup = {
    open: createPopup,
    close: closePopup
  };
  
})();
