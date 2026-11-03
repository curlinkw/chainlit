import { submitMessage } from '../../support/testUtils';

export function tests() {
  it('should let the task run to completion when stop is clicked without on_stop', () => {
    submitMessage('Hello');

    // Click stop while the task is still running.
    cy.get('#stop-button').should('exist').click();

    // New behaviour: the stop handler does not cancel the task,
    // so Message 2 is still emitted after ~1 s.
    cy.get('.step').should('have.length', 3);
    cy.get('.step').last().should('contain.text', 'Message 2');

    // The stop button disappears only when the task actually ends.
    cy.get('#stop-button').should('not.exist');
  });
}
