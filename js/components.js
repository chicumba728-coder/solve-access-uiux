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

  // ─── Operational Modals (SamoraFit & ZKTeco Integration) ───────────────────

  function openRenovarModal(clienteId, nome, saldoAtual = 0) {
    const divida = saldoAtual < 0 ? Math.abs(saldoAtual) : 0;
    const initialClasses = 10;
    const initialLiquido = Math.max(0, initialClasses - divida);

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div>
            <p style="font-size: 14px; font-weight: 600; color: var(--foreground);">${nome}</p>
            <p style="font-size: 12px; color: var(--muted-foreground);">ID Cliente: #${clienteId}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; color: var(--muted-foreground);">Saldo Atual</p>
            <span class="badge ${saldoAtual < 0 ? 'badge-negative' : 'badge-paid'}">${saldoAtual < 0 ? `${saldoAtual} aulas (Tolerância)` : `${saldoAtual} aulas`}</span>
          </div>
        </div>

        ${divida > 0 ? `
          <div class="tolerance-warning-box">
            <strong>Aviso de Tolerância Ativa:</strong>
            <span>O utente utilizou ${divida} acesso(s) extra de cortesia. Este valor será abatido automaticamente ao novo saldo contratado.</span>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Pacote / Crédito de Aulas</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;">
              <input type="radio" name="renovar-qtd" value="10" checked onchange="UI.updateRenovarCalc(${divida})" />
              <span style="font-size: 13px; font-weight: 500;">10 Aulas (Padrão)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;">
              <input type="radio" name="renovar-qtd" value="20" onchange="UI.updateRenovarCalc(${divida})" />
              <span style="font-size: 13px; font-weight: 500;">20 Aulas</span>
            </label>
          </div>
        </div>

        <div class="renewal-calc-card">
          <div class="renewal-calc-line">
            <span style="color: var(--muted-foreground);">Aulas Contratadas:</span>
            <span id="renovar-calc-contratadas" style="font-weight: 600;">${initialClasses} aulas</span>
          </div>
          <div class="renewal-calc-line">
            <span style="color: var(--muted-foreground);">Dívida de Tolerância:</span>
            <span style="color: ${divida > 0 ? 'var(--status-overdue)' : 'var(--muted-foreground)'}; font-weight: 600;">-${divida} aulas</span>
          </div>
          <div class="renewal-calc-line renewal-calc-total">
            <span>Saldo Líquido Disponível:</span>
            <span id="renovar-calc-liquido" style="color: var(--primary); font-size: 14px;">${initialLiquido} aulas</span>
          </div>
          <div style="font-size: 11px; color: var(--muted-foreground); margin-top: 4px;">
            * Validade estrita de 30 dias a partir da data de ativação (Ginásio SamoraFit).
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="UI.confirmarRenovacao('${nome}', ${divida})">
        ${Icons.get('check', 14)} Confirmar Renovação
      </button>
    `;

    openModal({
      title: 'Renovar Acesso & Créditos de Aulas',
      subtitle: 'Ginásio SamoraFit — Débito e Liquidação de Tolerância',
      contentHtml,
      footerHtml,
      size: 'md'
    });
  }

  function updateRenovarCalc(divida) {
    const selected = document.querySelector('input[name="renovar-qtd"]:checked');
    const aulas = selected ? parseInt(selected.value, 10) : 10;
    const liquido = Math.max(0, aulas - divida);

    const elContratadas = document.getElementById('renovar-calc-contratadas');
    const elLiquido = document.getElementById('renovar-calc-liquido');

    if (elContratadas) elContratadas.textContent = `${aulas} aulas`;
    if (elLiquido) elLiquido.textContent = `${liquido} aulas`;
  }

  function confirmarRenovacao(nome, divida) {
    closeModal();
    showToast(`Acesso de ${nome} renovado com sucesso! Dívida de ${divida} aulas abatida e ciclo de 30 dias iniciado.`, 'success');
  }

  function openDigitalModal(clienteId, nome) {
    const contentHtml = `
      <div class="biometric-scan-container">
        <div class="biometric-scanner-ring" id="bio-scanner-ring">
          ${Icons.get('fingerprint', 42)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 id="bio-scan-title" style="font-size: 16px; font-weight: 600; color: var(--foreground);">Pronto para Leitura</h3>
          <p id="bio-scan-desc" style="font-size: 13px; color: var(--muted-foreground); max-width: 320px;">
            Posicione o dedo indicador no leitor ZKTeco SpeedFace ou leitor biométrico USB.
          </p>
        </div>
        <div style="width: 100%; background: #f1f5f9; border-radius: var(--radius-full); height: 6px; overflow: hidden; margin-top: 8px;">
          <div id="bio-progress-bar" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.4s ease;"></div>
        </div>
        <p id="bio-samples-count" style="font-size: 11px; font-family: var(--font-mono); color: var(--muted-foreground);">0 de 3 amostras capturadas</p>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-capturar-bio" onclick="UI.simularCapturaBiometrica('${nome}')">
        ${Icons.get('fingerprint', 14)} Iniciar Captura
      </button>
    `;

    openModal({
      title: 'Registar Impressão Digital — ZKBio CVAccess',
      subtitle: `Cliente: ${nome} (ID #${clienteId})`,
      contentHtml,
      footerHtml,
      size: 'sm'
    });
  }

  function simularCapturaBiometrica(nome) {
    const btn = document.getElementById('btn-capturar-bio');
    const title = document.getElementById('bio-scan-title');
    const desc = document.getElementById('bio-scan-desc');
    const progress = document.getElementById('bio-progress-bar');
    const samples = document.getElementById('bio-samples-count');

    if (btn) btn.disabled = true;
    if (title) title.textContent = 'A capturar amostra 1/3...';
    if (desc) desc.textContent = 'Mantenha o dedo firme no leitor.';
    if (progress) progress.style.width = '33%';
    if (samples) samples.textContent = '1 de 3 amostras capturadas';

    setTimeout(() => {
      if (title) title.textContent = 'Levante e coloque o dedo novamente (2/3)...';
      if (progress) progress.style.width = '66%';
      if (samples) samples.textContent = '2 de 3 amostras capturadas';

      setTimeout(() => {
        if (title) title.textContent = 'A verificar qualidade da amostra (3/3)...';
        if (progress) progress.style.width = '100%';
        if (samples) samples.textContent = '3 de 3 amostras capturadas';

        setTimeout(() => {
          if (title) {
            title.textContent = 'Biometria Registada!';
            title.style.color = 'var(--primary)';
          }
          if (desc) desc.textContent = 'Template biométrico salvo e sincronizado com os terminais ZKTeco SpeedFace.';
          showToast(`Digital de ${nome} registada com sucesso no ZKBio CVAccess!`, 'success');

          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `${Icons.get('check', 14)} Concluído`;
            btn.onclick = () => closeModal();
          }
        }, 800);
      }, 900);
    }, 900);
  }

  function openNovoTerminalModal() {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label">Nome de Identificação do Terminal *</label>
          <input type="text" id="term-nome" class="form-input" placeholder="Ex: Catraca Principal - Entrada 01" value="Catraca Principal - Entrada 01" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Modelo ZKTeco *</label>
            <select id="term-modelo" class="form-select">
              <option value="SpeedFace V5L" selected>SpeedFace V5L [TD]</option>
              <option value="ProFace X">ProFace X</option>
              <option value="SenseFace 7A">SenseFace 7A</option>
              <option value="inBio Pro 460">inBio Pro 460 (Controladora)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Catraca *</label>
            <select id="term-tipo" class="form-select">
              <option value="entrada" selected>Entrada (Sentido Ginásio)</option>
              <option value="saida">Saída (Desmarca Presença)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Endereço IP na Rede Local *</label>
            <input type="text" id="term-ip" class="form-input font-mono" placeholder="192.168.1.201" value="192.168.1.201" />
          </div>
          <div class="form-group">
            <label class="form-label">Porta TCP *</label>
            <input type="number" id="term-porta" class="form-input font-mono" value="4370" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Chave de Comunicação (Comm Key)</label>
            <input type="number" id="term-commkey" class="form-input font-mono" value="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Número de Série (S/N)</label>
            <input type="text" id="term-serial" class="form-input font-mono" placeholder="Ex: CKN92140023" value="SF-V5L-98421" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Localização Física</label>
          <input type="text" id="term-local" class="form-input" placeholder="Ex: Recepção / Acesso Principal" value="Recepção / Acesso Principal" />
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
      <button class="btn btn-outline" onclick="UI.testarConexaoTerminal()">
        ${Icons.get('wifi', 14)} Testar Comunicação
      </button>
      <button class="btn btn-primary" onclick="UI.salvarNovoTerminal()">
        ${Icons.get('check', 14)} Guardar Terminal
      </button>
    `;

    openModal({
      title: 'Registar Terminal ZKTeco (Catraca SpeedFace)',
      subtitle: 'Comunicação via protocolo Standalone ZKEMKeeper / Porta 4370',
      contentHtml,
      footerHtml,
      size: 'md'
    });
  }

  function testarConexaoTerminal() {
    const ip = document.getElementById('term-ip')?.value || '192.168.1.201';
    showToast(`A testar conexão com ${ip}:4370... Resposta recebida (Ping: 4ms) — Terminal ZKTeco Online!`, 'success');
  }

  function salvarNovoTerminal() {
    const nome = document.getElementById('term-nome')?.value || 'Terminal ZKTeco';
    closeModal();
    showToast(`Terminal "${nome}" registado com sucesso no sistema!`, 'success');
  }

  function openResetMensalModal() {
    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="padding: 14px 16px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); font-size: 13px; color: #92400e;">
          <strong style="display: block; margin-bottom: 4px;">Ciclo de 30 Dias — Ginásio SamoraFit:</strong>
          Esta operação reinicia as entradas de todos os utentes ativos para o novo mês, zera o contador do ciclo anterior e aplica o desconto automático das aulas extras utilizadas em tolerância (-1 ou -2).
        </div>

        <div class="form-group">
          <label class="form-label">Palavra-passe de Administrador *</label>
          <input type="password" id="reset-password-input" class="form-input" placeholder="Digite a sua senha de acesso para confirmar..." />
        </div>

        <label style="display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer;">
          <input type="checkbox" id="reset-sync-zk" checked />
          <span>Sincronizar imediatamente com as catracas ZKTeco SpeedFace</span>
        </label>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background-color: var(--status-overdue); border-color: transparent;" onclick="UI.executarResetMensal()">
        ${Icons.get('refresh-cw', 14)} Executar Reinício de Entradas
      </button>
    `;

    openModal({
      title: 'Reiniciar Entradas do Mês (Reset Mensal)',
      subtitle: 'Renovação em lote de ciclos e liquidação de tolerâncias',
      contentHtml,
      footerHtml,
      size: 'md'
    });
  }

  function executarResetMensal() {
    const pwd = document.getElementById('reset-password-input')?.value;
    if (!pwd) {
      showToast('Por favor introduza a sua palavra-passe de Administrador para confirmar.', 'error');
      return;
    }
    closeModal();
    showToast('Reset mensal executado com sucesso! Contadores zerados, saldos devedores liquidados e catracas sincronizadas.', 'success');
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
    closeMobileSidebar,
    openRenovarModal,
    updateRenovarCalc,
    confirmarRenovacao,
    openDigitalModal,
    simularCapturaBiometrica,
    openNovoTerminalModal,
    testarConexaoTerminal,
    salvarNovoTerminal,
    openResetMensalModal,
    executarResetMensal
  };
})();

if (typeof window !== 'undefined') window.UI = UI;
if (typeof globalThis !== 'undefined') globalThis.UI = UI;
