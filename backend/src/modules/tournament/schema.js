export const createTournamentSchema = {
  summary: 'Create a new tournament',
  tags: ['Tournament'],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      max_participants: { type: 'integer', minimum: 4, maximum: 64 },
      prize: { type: 'string', maxLength: 200 },
      start_date: { type: 'string', format: 'date-time' }
    },
    required: ['name', 'max_participants'],
    additionalProperties: false
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tournament: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            max_participants: { type: 'integer' },
            status: { type: 'string' },
            prize: { type: 'string' },
            start_date: { type: 'string' },
            created_by: { type: 'integer' },
            created_at: { type: 'string' }
          }
        }
      }
    }
  }
};

export const listTournamentsSchema = {
  summary: 'Get list of tournaments',
  tags: ['Tournament'],
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['registration', 'in_progress', 'completed'] },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tournaments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              max_participants: { type: 'integer' },
              current_participants: { type: 'integer' },
              status: { type: 'string' },
              prize: { type: 'string' },
              start_date: { type: 'string' },
              created_at: { type: 'string' }
            }
          }
        },
        total: { type: 'integer' }
      }
    }
  }
};

export const joinTournamentSchema = {
  summary: 'Join a tournament',
  tags: ['Tournament'],
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer' }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

export const getTournamentSchema = {
  summary: 'Get tournament details',
  tags: ['Tournament'],
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer' }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        tournament: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            max_participants: { type: 'integer' },
            status: { type: 'string' },
            prize: { type: 'string' },
            start_date: { type: 'string' },
            created_by: { type: 'integer' },
            created_at: { type: 'string' }
          }
        },
        participants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
              registered_at: { type: 'string' },
              placement: { type: ['integer', 'null'] }
            }
          }
        },
        bracket: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              round: { type: 'integer' },
              player1: { type: 'object' },
              player2: { type: 'object' },
              winner: { type: ['object', 'null'] },
              played_at: { type: ['string', 'null'] }
            }
          }
        }
      }
    }
  }
};

export const startTournamentSchema = {
  summary: 'Start a tournament',
  tags: ['Tournament'],
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer' }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};