// ***********************************************************
// Cypress E2E Support File
// ***********************************************************

// Custom commands
Cypress.Commands.add('login', (email = 'admin@netguard.io', password = 'Admin@NetGuard2024!') => {
  cy.visit('/');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('logout', () => {
  cy.get('.logoutBtn').click();
});

Cypress.Commands.add('clearAuth', () => {
  cy.clearLocalStorage('ng-token');
  cy.clearLocalStorage('ng-user');
});

// API helpers
Cypress.Commands.add('apiLogin', (email, password) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password }
  });
});

// Accessibility check
Cypress.Commands.add('checkA11y', (context = null, options = null) => {
  cy.injectAxe();
  cy.checkA11y(context, options);
});

// Hide fetch/XHR requests in command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.setAttribute('data-hide-command-log-request', '');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  app.document.head.appendChild(style);
}
