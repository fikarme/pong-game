# ft_transcendence Evaluation Practice Sheets

## 📋 **Sheet 1: Backend Knowledge (For Frontend Developer)**

### **Basic Questions (Score: 30 points)**

1. **HTTP Methods** (5 points)
   - Q: What HTTP method should be used to join a tournament?
   - A: POST - because we're creating a new tournament participation record
   - Q: What status code is returned when a tournament is full?
   - A: 400 Bad Request with error message "Tournament is full"

2. **Authentication** (10 points)
   - Q: How does JWT authentication work in this project?
   - A: JWT tokens are generated on login, stored in localStorage, sent in Authorization header as "Bearer <token>", verified by middleware on protected routes
   - Q: What happens when a JWT token expires?
   - A: Server returns 401 Unauthorized, frontend redirects to login page

3. **WebSocket Communication** (15 points)
   - Q: Explain the WebSocket message format for game moves
   - A: `{ type: 'game', event: 'move', data: { direction: 'up' | 'down' } }`
   - Q: How does real-time game state synchronization work?
   - A: Server maintains game state, broadcasts updates to all connected players, frontend renders received state

### **Advanced Questions (Score: 40 points)**

4. **Database Relationships** (15 points)
   - Q: Explain the relationship between tournaments and tournament_matches tables
   - A: One-to-many relationship where tournaments can have multiple matches, matches reference tournament_id, allows bracket progression tracking

5. **Tournament Logic** (15 points)
   - Q: How would you implement automatic tournament bracket generation?
   - A: Shuffle participants, create first round matches (pairs), generate subsequent rounds based on winners, handle bye rounds for odd numbers

6. **Security Measures** (10 points)
   - Q: What prevents cheating in online games?
   - A: Server-side game state validation, move rate limiting, input sanitization, authoritative server model

### **Practical Tasks (Score: 30 points)**

7. **API Testing** (10 points)
   ```bash
   # Create user
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@test.com","password":"password123"}'
   
   # Create tournament
   curl -X POST http://localhost:3000/api/tournaments \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Tournament","max_participants":8}'
   ```

8. **Database Queries** (10 points)
   ```sql
   -- Get tournament with participant count
   SELECT t.*, COUNT(tp.user_id) as participant_count 
   FROM tournaments t 
   LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id 
   WHERE t.id = 1 
   GROUP BY t.id;
   ```

9. **Friend System** (10 points)
   ```bash
   # Send friend request
   curl -X POST http://localhost:3000/friends/add/2 \
     -H "Authorization: Bearer <token>"
   ```

---

## 📋 **Sheet 2: Frontend Knowledge (For Backend Developer)**

### **Basic Questions (Score: 30 points)**

1. **TypeScript SPA Architecture** (10 points)
   - Q: How does the router work without changing the URL?
   - A: Uses History API pushState to update browser history, internal route mapping, manual page loading via fetch and dynamic imports

2. **Tailwind CSS** (10 points)
   - Q: What are the benefits of utility-first CSS?
   - A: Rapid development, consistent design system, small bundle size, no CSS naming conflicts, responsive design built-in

3. **WebSocket Client** (10 points)
   - Q: How does the game page connect to the WebSocket backend?
   - A: GameWebSocketService connects to ws://localhost:3000/ws, sends auth token, handles events with callback system

### **Advanced Questions (Score: 40 points)**

4. **Component Lifecycle** (15 points)
   - Q: Explain how the game rendering system works
   - A: GameRenderer class manages canvas, receives GameState updates via WebSocket, renders at 60fps with requestAnimationFrame, handles state changes

5. **Responsive Design** (15 points)
   - Q: How is mobile responsive design implemented?
   - A: Tailwind breakpoints (md:, lg:), flexible layouts with Flexbox/Grid, mobile-first approach, responsive typography

6. **State Management** (10 points)
   - Q: How is application state managed without frameworks?
   - A: Event-driven architecture, localStorage for auth, WebSocket for real-time state, DOM as view layer, TypeScript interfaces for type safety

### **Practical Tasks (Score: 30 points)**

7. **Navigation Testing** (10 points)
   ```javascript
   // In browser console
   router.navigate('tournament');
   router.navigate('game');
   router.navigate('profile-settings');
   ```

8. **Game State Inspection** (10 points)
   ```javascript
   // View WebSocket messages in Network tab
   // Inspect game state updates
   console.log(gameService.getGameState());
   ```

9. **Style Modifications** (10 points)
   ```html
   <!-- Change tournament card colors -->
   <div class="bg-gradient-to-r from-purple-500 to-purple-600">
   ```

---

## 📋 **Sheet 3: ft_transcendence Requirements Checklist**

### **Mandatory Features (Score: 70 points)**

#### **User Account System** (10 points)
- [x] User registration with username, email, password
- [x] OAuth authentication (Google)
- [x] Profile customization with avatar upload
- [x] Secure password hashing (Argon2)

#### **Real-time Pong Game** (15 points)
- [x] WebSocket-based multiplayer
- [x] Smooth 60fps rendering
- [x] Keyboard controls (WASD, arrows)
- [x] Score tracking and game state sync
- [x] Reconnection handling

#### **Tournament System** (15 points)
- [x] Tournament creation and management
- [x] 8+ player support with bracket generation
- [x] Automatic match progression
- [x] Winner determination and placement
- [x] Tournament history and statistics

#### **Social Features** (10 points)
- [x] Friend system with requests
- [x] User blocking functionality
- [x] Real-time chat system
- [x] User search and profiles

#### **Game History & Statistics** (10 points)
- [x] Match history tracking
- [x] Win/loss statistics
- [x] Tournament participation history
- [x] Leaderboard system

#### **Security** (10 points)
- [x] JWT authentication with expiration
- [x] 2FA support (TOTP)
- [x] Input validation and sanitization
- [x] Rate limiting on sensitive endpoints
- [x] HTTPS ready configuration

### **Bonus Features (Score: 30 points)**

#### **Advanced Game Features** (10 points)
- [x] Enhanced graphics with ball trails
- [x] Spectator mode
- [x] Game physics improvements
- [ ] Power-ups (planned)
- [ ] Multiple game modes (planned)

#### **User Experience** (10 points)
- [x] Responsive design (mobile-friendly)
- [x] Loading states and error handling
- [x] Professional UI with Tailwind CSS
- [x] Intuitive navigation system

#### **Technical Excellence** (10 points)
- [x] TypeScript strict mode
- [x] Modular backend architecture
- [x] Docker containerization
- [x] Monitoring and metrics
- [x] Clean code and documentation

---

## 🎯 **Evaluation Scenarios**

### **Scenario 1: Live Demo (20 minutes)**
1. **Registration & Login** (3 min)
   - Create new account
   - Enable 2FA
   - Login with 2FA code

2. **Multiplayer Game** (5 min)
   - Start game from landing page
   - Connect with second player
   - Play full match to completion

3. **Tournament** (7 min)
   - Create new tournament
   - Join as multiple users
   - Start tournament and progress through bracket

4. **Social Features** (3 min)
   - Send friend request
   - Use chat system
   - View user profiles

5. **Statistics** (2 min)
   - Show game history
   - Display leaderboard
   - View tournament results

### **Scenario 2: Code Review (15 minutes)**
1. **Architecture Overview** (5 min)
   - Backend module structure
   - Frontend component system
   - Database relationships

2. **Security Implementation** (5 min)
   - Authentication flow
   - Input validation
   - WebSocket security

3. **Performance Optimizations** (5 min)
   - Game rendering efficiency
   - Database query optimization
   - Frontend build process

### **Scenario 3: Technical Q&A (10 minutes)**
1. **How would you scale this to 1000+ concurrent users?**
2. **What security vulnerabilities could exist and how to prevent them?**
3. **How would you implement tournament streaming/spectating?**
4. **What metrics would you monitor in production?**

---

## 📊 **Scoring Rubric**

### **Functionality (40%)**
- All features work as expected
- No critical bugs
- Smooth user experience
- Performance meets requirements

### **Code Quality (30%)**
- Clean, readable code
- Proper TypeScript usage
- Good separation of concerns
- Comprehensive error handling

### **Security (20%)**
- Authentication properly implemented
- Input validation present
- No obvious vulnerabilities
- Secure communication

### **Innovation (10%)**
- Creative solutions
- Bonus features implemented
- Technical excellence
- Professional polish

**Total Score: 100 points**
**Passing Grade: 70+ points**
**Excellence Grade: 90+ points**

---

## 🎓 **Study Resources**

### **Backend Topics**
- RESTful API design
- WebSocket protocols
- Database relationships
- JWT authentication
- Node.js security

### **Frontend Topics**
- TypeScript fundamentals
- SPA architecture
- Canvas rendering
- CSS frameworks
- Event-driven programming

### **System Design**
- Real-time applications
- Tournament bracket algorithms
- Scalability patterns
- Security best practices
- Performance optimization

**Good luck with your evaluation! 🚀**