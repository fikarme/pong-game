import { initDB } from '../../../config/db.js';

export class TournamentService {
  
  // Create a new tournament
  static async createTournament(tournamentData, createdBy) {
    const db = await initDB();
    
    const { name, description, max_participants, prize, start_date } = tournamentData;
    
    const sql = `
      INSERT INTO tournaments (name, description, max_participants, prize, start_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await db.run(sql, [
        name,
        description || null,
        max_participants,
        prize || null,
        start_date || null,
        createdBy
      ]);
      
      return await this.getTournamentById(result.lastID);
    } catch (error) {
      throw new Error(`Failed to create tournament: ${error.message}`);
    }
  }
  
  // Get tournament by ID
  static async getTournamentById(tournamentId) {
    const db = await initDB();
    
    const sql = `
      SELECT t.*, u.username as creator_username,
             COUNT(tp.user_id) as current_participants
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE t.id = ?
      GROUP BY t.id
    `;
    
    const tournament = await db.get(sql, [tournamentId]);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    return tournament;
  }
  
  // List tournaments with filters
  static async listTournaments(filters = {}) {
    const db = await initDB();
    
    const { status, limit = 20, offset = 0 } = filters;
    
    let sql = `
      SELECT t.*, u.username as creator_username,
             COUNT(tp.user_id) as current_participants
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
    `;
    
    const params = [];
    
    if (status) {
      sql += ' WHERE t.status = ?';
      params.push(status);
    }
    
    sql += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const tournaments = await db.all(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM tournaments';
    if (status) {
      countSql += ' WHERE status = ?';
    }
    
    const countParams = status ? [status] : [];
    const { total } = await db.get(countSql, countParams);
    
    return { tournaments, total };
  }
  
  // Join a tournament
  static async joinTournament(tournamentId, userId) {
    const db = await initDB();
    
    // Check if tournament exists and is open for registration
    const tournament = await this.getTournamentById(tournamentId);
    
    if (tournament.status !== 'registration') {
      throw new Error('Tournament is not open for registration');
    }
    
    if (tournament.current_participants >= tournament.max_participants) {
      throw new Error('Tournament is full');
    }
    
    // Check if user is already registered
    const existingParticipant = await db.get(
      'SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, userId]
    );
    
    if (existingParticipant) {
      throw new Error('You are already registered for this tournament');
    }
    
    // Add participant
    await db.run(
      'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
      [tournamentId, userId]
    );
    
    return { message: 'Successfully joined tournament' };
  }
  
  // Get tournament participants
  static async getTournamentParticipants(tournamentId) {
    const db = await initDB();
    
    const sql = `
      SELECT tp.*, u.username, u.wins, u.losses
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.registered_at ASC
    `;
    
    return await db.all(sql, [tournamentId]);
  }
  
  // Start tournament and generate bracket
  static async startTournament(tournamentId, userId) {
    const db = await initDB();
    
    const tournament = await this.getTournamentById(tournamentId);
    
    // Check permissions (only creator can start)
    if (tournament.created_by !== userId) {
      throw new Error('Only tournament creator can start the tournament');
    }
    
    if (tournament.status !== 'registration') {
      throw new Error('Tournament cannot be started in current status');
    }
    
    if (tournament.current_participants < 2) {
      throw new Error('Need at least 2 participants to start tournament');
    }
    
    // Get participants
    const participants = await this.getTournamentParticipants(tournamentId);
    
    // Generate bracket
    await this.generateBracket(tournamentId, participants);
    
    // Update tournament status
    await db.run(
      'UPDATE tournaments SET status = ?, start_date = ? WHERE id = ?',
      ['in_progress', new Date().toISOString(), tournamentId]
    );
    
    return { message: 'Tournament started successfully' };
  }
  
  // Generate tournament bracket
  static async generateBracket(tournamentId, participants) {
    const db = await initDB();
    
    // Shuffle participants for random seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    // Create first round matches
    const firstRoundMatches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        firstRoundMatches.push({
          round: 1,
          player1_id: shuffled[i].user_id,
          player2_id: shuffled[i + 1].user_id
        });
      }
    }
    
    // Insert first round matches
    for (const match of firstRoundMatches) {
      await db.run(
        'INSERT INTO tournament_matches (tournament_id, round, player1_id, player2_id) VALUES (?, ?, ?, ?)',
        [tournamentId, match.round, match.player1_id, match.player2_id]
      );
    }
    
    return firstRoundMatches;
  }
  
  // Get tournament bracket
  static async getTournamentBracket(tournamentId) {
    const db = await initDB();
    
    const sql = `
      SELECT tm.*, 
             u1.username as player1_username,
             u2.username as player2_username,
             uw.username as winner_username
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      LEFT JOIN users uw ON tm.winner_id = uw.id
      WHERE tm.tournament_id = ?
      ORDER BY tm.round ASC, tm.id ASC
    `;
    
    return await db.all(sql, [tournamentId]);
  }
  
  // Complete a tournament match
  static async completeMatch(matchId, winnerId, player1Score, player2Score) {
    const db = await initDB();
    
    await db.run(
      `UPDATE tournament_matches 
       SET winner_id = ?, player1_score = ?, player2_score = ?, played_at = ?
       WHERE id = ?`,
      [winnerId, player1Score, player2Score, new Date().toISOString(), matchId]
    );
    
    // Check if this was the final match and update tournament status
    const match = await db.get('SELECT * FROM tournament_matches WHERE id = ?', [matchId]);
    const tournament = await this.getTournamentById(match.tournament_id);
    
    // If this completes the tournament, update status
    const pendingMatches = await db.get(
      'SELECT COUNT(*) as count FROM tournament_matches WHERE tournament_id = ? AND winner_id IS NULL',
      [match.tournament_id]
    );
    
    if (pendingMatches.count === 0) {
      await db.run(
        'UPDATE tournaments SET status = ?, end_date = ? WHERE id = ?',
        ['completed', new Date().toISOString(), match.tournament_id]
      );
    }
    
    return { message: 'Match completed successfully' };
  }
}