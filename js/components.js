/**
 * Solve Acess — Interactive UI Components in Vanilla JavaScript
 * Handles Modals, Drawers, Dropdowns, Tabs, Toggles, Toasts & Shell Controls
 */

const UI = (() => {
  // DOM References
  let modalBackdrop = null;
  let modalTitle = null;
  let modalSubtitle = null;
  let modalBody = null;
  let modalFooter = null;
  let modalBox = null;

  let drawerBackdrop = null;
  let drawerPanel = null;
  let drawerTitle = null;
  let drawerSubtitle = null;
  let drawerBody = null;
  let drawerFooter = null;

  let toastContainer = null;

  /**
   * Initializes components when DOM is ready
   */
  function init() {
    // Cache floating containers
    modalBackdrop = document.getElementById('modal-container');
    if (modalBackdrop) {
      modalBox = modalBackdrop.querySelector('.modal');
      modalTitle = modalBackdrop.querySelector('.modal-title');
      modalSubtitle = modalBackdrop.querySelector('.modal-subtitle');
      modalBody = modalBackdrop.querySelector('.modal-body');
      modalFooter = modalBackdrop.querySelector('.modal-footer');
    }

    drawerBackdrop = document.getElementById('drawer-container');
    if (drawerBackdrop) {
      drawerPanel = drawerBackdrop.querySelector('.drawer');
      drawerTitle = drawerBackdrop.querySelector('.drawer-title');
      drawerSubtitle = drawerBackdrop.querySelector('.drawer-subtitle');
      drawerBody = drawerBackdrop.querySelector('.drawer-body');
      drawerFooter = drawerBackdrop.querySelector('.drawer-footer');
    }

    toastContainer = document.getElementById('toast-container');

    setupGlobalListeners();
    setupHeaderControls();
    setupSidebarControls();
  }

  /**
   * Global event listeners for dismissal (outside click, Escape key)
   */
  function setupGlobalListeners() {
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      // User dropdown
      const userWrap = document.querySelector('.header-user-wrap');
      const userMenu = document.getElementById('user-menu');
      if (userWrap && userMenu && !userWrap.contains(e.target)) {
        userMenu.classList.remove('open');
      }

      // Notifications dropdown
      const notifWrap = document.querySelector('.header-notif-wrap');
      const notifMenu = document.getElementById('notif-menu');
      if (notifWrap && notifMenu && !notifWrap.contains(e.target)) {
        notifMenu.classList.remove('open');
      }

      // Generic dropdown menus
      document.querySelectorAll('.dropdown-menu.open').forEach(menu => {
        if (!menu.parentElement.contains(e.target)) {
          menu.classList.remove('open');
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeDrawer();
        closeAllDropdowns();
        collapseHeaderSearch();
        closeMobileSidebar();
      }
    });

    // Close modal on backdrop click
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    // Close drawer on backdrop click
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', (e) => {
        if (e.target === drawerBackdrop) closeDrawer();
      });
    }
  }

  /**
   * Header interactions: Search expansion, Notifications & User menu
   */
  function setupHeaderControls() {
    // Search toggle
    const searchWrap = document.getElementById('header-search');
    const searchBtn = document.getElementById('search-toggle-btn');
    const searchInput = document.getElementById('header-search-input');

    if (searchWrap && searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        searchWrap.classList.remove('collapsed');
        searchWrap.classList.add('expanded');
        searchInput.focus();
      });

      searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
          searchWrap.classList.remove('expanded');
          searchWrap.classList.add('collapsed');
        }
      });
    }

    // Notifications toggle
    const notifBtn = document.getElementById('notif-toggle-btn');
    const notifMenu = document.getElementById('notif-menu');
    if (notifBtn && notifMenu) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns('notif');
        notifMenu.classList.toggle('open');
      });
    }

    // User profile toggle
    const userBtn = document.getElementById('user-toggle-btn');
    const userMenu = document.getElementById('user-menu');
    if (userBtn && userMenu) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns('user');
        userMenu.classList.toggle('open');
      });
    }

    // Mobile menu toggle button
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        toggleMobileSidebar();
      });
    }

    // Overlay click closes mobile sidebar
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        closeMobileSidebar();
      });
    }
  }

  /**
   * Sidebar controls: Desktop collapse/expand toggle
   */
  function setupSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        const iconContainer = toggleBtn.querySelector('.toggle-icon');
        const textLabel = toggleBtn.querySelector('.toggle-label');

        if (isCollapsed) {
          if (iconContainer) iconContainer.innerHTML = Icons.get('chevron-right', 14);
          if (textLabel) textLabel.textContent = '';
        } else {
          if (iconContainer) iconContainer.innerHTML = Icons.get('chevron-left', 14);
          if (textLabel) textLabel.textContent = 'Recolher';
        }
      });
    }
  }

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function collapseHeaderSearch() {
    const searchWrap = document.getElementById('header-search');
    const searchInput = document.getElementById('header-search-input');
    if (searchWrap && searchInput) {
      searchInput.value = '';
      searchWrap.classList.remove('expanded');
      searchWrap.classList.add('collapsed');
    }
  }

  function closeAllDropdowns(exclude = '') {
    if (exclude !== 'notif') {
      const notif = document.getElementById('notif-menu');
      if (notif) notif.classList.remove('open');
    }
    if (exclude !== 'user') {
      const user = document.getElementById('user-menu');
      if (user) user.classList.remove('open');
    }
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }

  // ─── Modal Operations ───────────────────────────────────────────────────────

  function openModal({ title, subtitle = '', contentHtml = '', footerHtml = '', size = 'md' }) {
    if (!modalBackdrop) return;

    if (modalTitle) modalTitle.textContent = title;
    if (modalSubtitle) {
      modalSubtitle.textContent = subtitle;
      modalSubtitle.style.display = subtitle ? 'block' : 'none';
    }
    if (modalBody) modalBody.innerHTML = contentHtml;
    if (modalFooter) {
      modalFooter.innerHTML = footerHtml;
      modalFooter.style.display = footerHtml ? 'flex' : 'none';
    }

    if (modalBox) {
      modalBox.className = `modal modal-${size}`;
    }

    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ─── Drawer Operations ──────────────────────────────────────────────────────

  function openDrawer({ title, subtitle = '', contentHtml = '', footerHtml = '', width = '480px' }) {
    if (!drawerBackdrop) return;

    if (drawerTitle) drawerTitle.textContent = title;
    if (drawerSubtitle) {
      drawerSubtitle.textContent = subtitle;
      drawerSubtitle.style.display = subtitle ? 'block' : 'none';
    }
    if (drawerBody) drawerBody.innerHTML = contentHtml;
    if (drawerFooter) {
      drawerFooter.innerHTML = footerHtml;
      drawerFooter.style.display = footerHtml ? 'flex' : 'none';
    }

    if (drawerPanel) {
      drawerPanel.style.width = width;
      // Force repaint before adding open class for smooth slide-in
      requestAnimationFrame(() => {
        drawerBackdrop.classList.add('open');
        drawerPanel.classList.add('open');
      });
    }

    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawerBackdrop || !drawerPanel) return;
    drawerPanel.classList.remove('open');
    setTimeout(() => {
      drawerBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }, 250);
  }

  // ─── Toast Notifications ───────────────────────────────────────────────────

  function showToast(message, type = 'success', duration = 3000) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? Icons.get('check-circle', 16) : Icons.get('alert-circle', 16);

    toast.innerHTML = `
      ${icon}
      <span>${message}</span>
      <span class="toast-close">${Icons.get('x', 14)}</span>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.2s';
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  }

  // ─── Reusable Tabs Binder ──────────────────────────────────────────────────

  function bindTabs(containerSelector, onChange) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const tabBtns = container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof onChange === 'function') {
          onChange(tabId);
        }
      });
    });
  }

  // ─── Reusable Toggle Switch Binder ─────────────────────────────────────────

  function bindToggles(containerSelector) {
    const root = containerSelector ? document.querySelector(containerSelector) : document;
    if (!root) return;

    root.querySelectorAll('.toggle-switch').forEach(sw => {
      sw.addEventListener('click', () => {
        sw.classList.toggle('active');
      });
    });
  }

  return {
    init,
    openModal,
    closeModal,
    openDrawer,
    closeDrawer,
    showToast,
    bindTabs,
    bindToggles,
    closeMobileSidebar
  };
})();

if (typeof window !== 'undefined') window.UI = UI;
if (typeof globalThis !== 'undefined') globalThis.UI = UI;
