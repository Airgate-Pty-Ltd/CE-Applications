import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Collapse,
  IconButton,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

const ClauseSelector = ({ clauses, selectedClauses, onClauseChange }) => {
  const [expandedClauses, setExpandedClauses] = React.useState({});

  const handleExpandClick = (clauseId) => {
    setExpandedClauses(prev => ({
      ...prev,
      [clauseId]: !prev[clauseId]
    }));
  };

  const renderClause = (clause, level = 0) => {
    const hasSubclauses = clause.subclauses && clause.subclauses.length > 0;
    const isExpanded = expandedClauses[clause.id] || false;

    return (
      <Box key={clause.id} sx={{ ml: level * 2 }} data-testid={`clause-${clause.id}`}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedClauses.includes(clause.id)}
                onChange={(e) => onClauseChange(e, clause.id)}
                size="small"
                data-testid={`checkbox-${clause.id}`}
              />
            }
            label={
              <Typography variant="body2">
                {clause.id} - {clause.title}
              </Typography>
            }
          />
          {hasSubclauses && (
            <IconButton
              size="small"
              onClick={() => handleExpandClick(clause.id)}
              sx={{ ml: 1 }}
              data-testid={`expand-button-${clause.id}`}
              aria-label={isExpanded ? 'collapse' : 'expand'}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {hasSubclauses && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ pl: 2 }}>
              {clause.subclauses.map(subclause => renderClause(subclause, level + 1))}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ maxHeight: '400px', overflow: 'auto', p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
      {clauses.map(clause => renderClause(clause))}
    </Box>
  );
};

export default ClauseSelector; 