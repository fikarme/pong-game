import { TournamentController } from '../controller/tournament.controller.js';
import {
  createTournamentSchema,
  listTournamentsSchema,
  getTournamentSchema,
  joinTournamentSchema,
  startTournamentSchema
} from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';

export default async function tournamentRoutes(fastify) {
  
  // Create tournament
  fastify.post('/tournaments', {
    preHandler: [verifyToken],
    schema: createTournamentSchema
  }, TournamentController.createTournament);
  
  // List tournaments
  fastify.get('/tournaments', {
    schema: listTournamentsSchema
  }, TournamentController.listTournaments);
  
  // Get specific tournament
  fastify.get('/tournaments/:id', {
    schema: getTournamentSchema
  }, TournamentController.getTournament);
  
  // Join tournament
  fastify.post('/tournaments/:id/join', {
    preHandler: [verifyToken],
    schema: joinTournamentSchema
  }, TournamentController.joinTournament);
  
  // Start tournament
  fastify.post('/tournaments/:id/start', {
    preHandler: [verifyToken],
    schema: startTournamentSchema
  }, TournamentController.startTournament);
  
  // Get tournament bracket
  fastify.get('/tournaments/:id/bracket', {
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      },
      required: ['id']
    }
  }, TournamentController.getTournamentBracket);
  
  // Complete match (for game results)
  fastify.put('/tournaments/matches/:matchId/complete', {
    preHandler: [verifyToken],
    params: {
      type: 'object',
      properties: {
        matchId: { type: 'integer' }
      },
      required: ['matchId']
    },
    body: {
      type: 'object',
      properties: {
        winnerId: { type: 'integer' },
        player1Score: { type: 'integer' },
        player2Score: { type: 'integer' }
      },
      required: ['winnerId', 'player1Score', 'player2Score']
    }
  }, TournamentController.completeMatch);
}