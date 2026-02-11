/**
 * Authentication E2E Tests
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.visit('/');
  });

  describe('Login', () => {
    it('should display login form', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Connexion');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('button[type="submit"]').click();
      cy.get('.error').should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('input[type="password"]').type('password123');
      cy.get('input[type="email"]').blur();
      cy.get('.error').should('contain', 'email valide');
    });

    it('should show error for wrong credentials', () => {
      cy.get('input[type="email"]').type('wrong@email.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      cy.get('.status.ko').should('be.visible');
    });

    it('should login successfully with valid credentials', () => {
      cy.login();
      cy.get('.dashboard').should('be.visible');
      cy.get('.header').should('contain', 'Tableau de bord');
    });

    it('should toggle password visibility', () => {
      cy.get('input[type="password"]').as('passwordInput');
      cy.get('@passwordInput').should('have.attr', 'type', 'password');
      cy.contains('Afficher').click();
      cy.get('@passwordInput').should('have.attr', 'type', 'text');
    });
  });

  describe('Registration', () => {
    beforeEach(() => {
      cy.contains('Créer un compte').click();
    });

    it('should display registration form', () => {
      cy.get('input#fullName').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should validate password strength', () => {
      cy.get('input[type="password"]').type('weak');
      cy.get('.passwordStrength').should('be.visible');
      cy.get('.strengthFill.weak').should('exist');
    });

    it('should show error for existing email', () => {
      cy.get('input#fullName').type('Test User');
      cy.get('input[type="email"]').type('admin@netguard.io');
      cy.get('input[type="password"]').type('StrongPass123!');
      cy.get('button[type="submit"]').click();
      cy.get('.status.ko').should('contain', 'déjà utilisée');
    });
  });

  describe('Forgot Password', () => {
    beforeEach(() => {
      cy.contains('Mot de passe oublié').click();
    });

    it('should display forgot password form', () => {
      cy.get('h2').should('contain', 'Mot de passe oublié');
      cy.get('input[type="email"]').should('be.visible');
    });

    it('should send reset email', () => {
      cy.get('input[type="email"]').type('admin@netguard.io');
      cy.get('button[type="submit"]').click();
      cy.get('.status.ok').should('be.visible');
    });
  });
});

describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should display dashboard stats', () => {
    cy.get('.statsGrid').should('be.visible');
    cy.get('.statCard').should('have.length.at.least', 3);
  });

  it('should display navigation', () => {
    cy.get('.sidebar').should('be.visible');
    cy.get('.navItem').should('have.length.at.least', 4);
  });

  it('should toggle theme', () => {
    cy.get('.themeBtn').click();
    cy.get('.dashboard').should('have.class', 'light');
    cy.get('.themeBtn').click();
    cy.get('.dashboard').should('have.class', 'dark');
  });

  it('should display alerts', () => {
    cy.get('.alertsCard').should('be.visible');
    cy.get('.alertItem').should('have.length.at.least', 1);
  });

  it('should display connected devices', () => {
    cy.get('.devicesCard').should('be.visible');
  });

  it('should logout successfully', () => {
    cy.logout();
    cy.get('input[type="email"]').should('be.visible');
  });
});

describe('Accessibility', () => {
  it('should have proper heading hierarchy', () => {
    cy.visit('/');
    cy.get('h1').should('exist');
    cy.get('h2').should('exist');
  });

  it('should have proper form labels', () => {
    cy.visit('/');
    cy.get('label[for="email"]').should('exist');
    cy.get('label[for="password"]').should('exist');
  });

  it('should be keyboard navigable', () => {
    cy.visit('/');
    cy.get('input[type="email"]').focus();
    cy.focused().should('have.attr', 'id', 'email');
    cy.focused().tab();
    cy.focused().should('have.attr', 'id', 'password');
  });
});

describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 }
  ];

  viewports.forEach(({ name, width, height }) => {
    it(`should display correctly on ${name}`, () => {
      cy.viewport(width, height);
      cy.visit('/');
      cy.get('.wrap').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
    });
  });
});
