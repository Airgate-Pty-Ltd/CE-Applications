import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClauseSelector from '../ClauseSelector';

const mockClauses = [
  {
    id: '4',
    title: 'Context of the Organization',
    subclauses: [
      {
        id: '4.1',
        title: 'Understanding the Organization and its Context',
        subclauses: [
          { id: '4.1.1', title: 'General Requirements' },
          { id: '4.1.2', title: 'External Issues' }
        ]
      }
    ]
  }
];

describe('ClauseSelector', () => {
  it('renders the clause selector with initial state', () => {
    render(
      <ClauseSelector
        clauses={mockClauses}
        selectedClauses={[]}
        onClauseChange={() => {}}
      />
    );

    // Check that the main clause is rendered
    expect(screen.getByText('4 - Context of the Organization')).toBeInTheDocument();
    
    // Check that subclauses are initially hidden
    expect(screen.queryByText('4.1 - Understanding the Organization and its Context')).not.toBeInTheDocument();
  });

  it('expands and collapses clauses when clicking the expand button', () => {
    render(
      <ClauseSelector
        clauses={mockClauses}
        selectedClauses={[]}
        onClauseChange={() => {}}
      />
    );

    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Check that subclauses are now visible
    expect(screen.getByText('4.1 - Understanding the Organization and its Context')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(expandButton);

    // Check that subclauses are hidden again
    expect(screen.queryByText('4.1 - Understanding the Organization and its Context')).not.toBeInTheDocument();
  });

  it('handles clause selection', () => {
    const handleClauseChange = jest.fn();
    
    render(
      <ClauseSelector
        clauses={mockClauses}
        selectedClauses={[]}
        onClauseChange={handleClauseChange}
      />
    );

    // Find and click the checkbox for the main clause
    const clauseCheckbox = screen.getByLabelText('4 - Context of the Organization');
    fireEvent.click(clauseCheckbox);

    // Verify that the change handler was called with the correct clause ID
    expect(handleClauseChange).toHaveBeenCalledWith(
      expect.any(Object), // The event object
      '4' // The clause ID
    );
  });

  it('shows selected clauses as checked', () => {
    render(
      <ClauseSelector
        clauses={mockClauses}
        selectedClauses={['4']}
        onClauseChange={() => {}}
      />
    );

    // Check that the selected clause is checked
    const clauseCheckbox = screen.getByLabelText('4 - Context of the Organization');
    expect(clauseCheckbox).toBeChecked();
  });

  it('renders nested clauses with proper indentation', () => {
    render(
      <ClauseSelector
        clauses={mockClauses}
        selectedClauses={[]}
        onClauseChange={() => {}}
      />
    );

    // Expand the main clause
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Check that the subclause is rendered with proper indentation
    const subclause = screen.getByText('4.1 - Understanding the Organization and its Context');
    expect(subclause).toBeInTheDocument();
    expect(subclause.closest('div')).toHaveStyle({ marginLeft: '2px' });
  });
}); 