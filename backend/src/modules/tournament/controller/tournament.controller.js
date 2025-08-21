import { TournamentService } from '../service/tournament.service.js';

export class TournamentController {
  
  // POST /tournaments - Create new tournament
  static async createTournament(request, reply) {
    try {
      const userId = request.user.id;
      const tournament = await TournamentService.createTournament(request.body, userId);
      
      reply.code(201).send({
        message: 'Tournament created successfully',
        tournament
      });
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  }
  
  // GET /tournaments - List tournaments
  static async listTournaments(request, reply) {
    try {
      const filters = {
        status: request.query.status,
        limit: request.query.limit,
        offset: request.query.offset
      };
      
      const result = await TournamentService.listTournaments(filters);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: error.message });
    }
  }
  
  // GET /tournaments/:id - Get tournament details
  static async getTournament(request, reply) {
    try {
      const tournamentId = request.params.id;
      
      const tournament = await TournamentService.getTournamentById(tournamentId);
      const participants = await TournamentService.getTournamentParticipants(tournamentId);
      const bracket = await TournamentService.getTournamentBracket(tournamentId);
      
      reply.send({
        tournament,
        participants,
        bracket
      });
    } catch (error) {
      reply.code(404).send({ error: error.message });
    }
  }
  
  // POST /tournaments/:id/join - Join tournament
  static async joinTournament(request, reply) {
    try {
      const tournamentId = request.params.id;
      const userId = request.user.id;
      
      const result = await TournamentService.joinTournament(tournamentId, userId);
      reply.send(result);
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  }
  
  // POST /tournaments/:id/start - Start tournament
  static async startTournament(request, reply) {
    try {
      const tournamentId = request.params.id;
      const userId = request.user.id;
      
      const result = await TournamentService.startTournament(tournamentId, userId);
      reply.send(result);
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  }
  
  // GET /tournaments/:id/bracket - Get tournament bracket
  static async getTournamentBracket(request, reply) {
    try {
      const tournamentId = request.params.id;
      const bracket = await TournamentService.getTournamentBracket(tournamentId);
      
      reply.send({ bracket });
    } catch (error) {
      reply.code(404).send({ error: error.message });
    }
  }
  
  // PUT /tournaments/matches/:matchId/complete - Complete a match
  static async completeMatch(request, reply) {
    try {
      const matchId = request.params.matchId;
      const { winnerId, player1Score, player2Score } = request.body;
      
      const result = await TournamentService.completeMatch(
        matchId, 
        winnerId, 
        player1Score, 
        player2Score
      );
      
      reply.send(result);
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  }
}