const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { reset } = require("nodemon");
const server = http.createServer(app);

app.use(cors());
/*
app.use(express.json())

const mysql = require('mysql');

const db = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"Bionicle2002@",
  database:"fish"
})

app.get('/', (req,res) => {
  res.json('BACKEND')
})

app.get('/users', (req,res) => {
  const q = "SELECT * FROM users"
  db.query(q, (err,data) => {
    if(err) return res.json(err)
    return res.json(data)
  })
})

app.post('/users', (req,res) => {
  const q = "INSERT INTO users (`username`) VALUES (?)"
  const values = [
    req.body.username
  ]
  db.query(q,values,(err,data) =>{
    if(err) return res.json(err)
    return res.json(`successfully added ${req.body.username}`)
  })
})
*/

function getDeck() {
  /*Initalize deck*/
  let deck = new Array();
  for (const suit of suitMAP.keys()) {
      for (const val of valsMAP.keys()) {
          let card = { value: val, suit: suit };
          deck.push(card);
      }
  }
  for (const suit of suitMAP.keys()) {
      let card = { value: "8", suit: suit }
      deck.push(card);
  }
  deck.push({ value: "Big Joker", suit: "*" })
  deck.push({ value: "Small Joker", suit: "*" })
  return deck;
}

function shuffleDeck() {
  let deck = Array(54).fill().map((element, index) => index)
  for (let i = 0; i < 1000; i++) {
      let l1 = Math.floor((Math.random() * deck.length));
      let l2 = Math.floor((Math.random() * deck.length));
      let tmp = deck[l1];
      deck[l1] = deck[l2];
      deck[l2] = tmp;
  }
  return deck;
}


function getHalfSuits() {
  /*map each card to the half suit it belongs to*/
  let halfsuits = new Map();
  for (let i = 0; i < 54; i++) {
      let set = Array(6).fill().map((element, index) => index + 6 * Math.floor(i/6))
      halfsuits.set(i, set);
  }
  return halfsuits;
}

function isValidCard(card) {
  if (valsMAP.has(card.value) && suitMAP.has(card.suit))
      return true
  if (card.value === '8' && suitMAP.has(card.suit))
      return true
  if ((card.value === 'Big Joker' || card.value === 'Small Joker') && card.suit === '*')
      return true;
  return false;
}

function getCard(card) {
  //get index of card in DECK
  if(!isValidCard(card))
      return -1
  if (card.value === 'Big Joker')
      return 52
  else if (card.value === 'Small Joker')
      return 53
  else if (card.value === '8') {
      return 48 + suitMAP.get(card.suit) - 1;
  }
  else {
      return (suitMAP.get(card.suit) - 1) * 12 + valsMAP.get(card.value) - 1;
  }
}

function hasHalfSuit(player,card_ind){
  //only called when card is valid
  let halfsuit = HALFSUITS.get(card_ind);
  for(let i = 0; i < halfsuit.length; i++){
      if(cardplayers.get(halfsuit[i]) === player)
          return true
  }
  return false
}

function setTeams() {
  //randomly assign players to teams
  let usernames = Array.from(players.keys())
  let indices = Array(usernames.length).fill().map((e,i) => i)
  for(let i = 0; i < 100; i++)
  {
    let l1 = Math.floor(Math.random() * indices.length);
    let l2 = Math.floor(Math.random() * indices.length);
    let tmp = indices[l1];
    indices[l1] = indices[l2];
    indices[l2] = tmp;
  }
  for(let i = 0; i < Math.floor(usernames.length/2); i++)
  {
    teamA.push(usernames[indices[i]])
  }
  for(let i = Math.floor(usernames.length/2); i < usernames.length; i++)
  {
    teamB.push(usernames[indices[i]])
  }
  //console.log(playerteams)
}

/*function startGame(deck){
  if(!gamestarted)
  {
    console.log('GAME STARTED');
    gamestarted = true;
    let n = 0;
    for(let [player, socket] of players.entries())
    {
      let split = new Set(deck.slice(9*n, 9*(n+1)))
      split.forEach(element => cardplayers.set(element,player))
      playercards.set(player, split)
    }
  }
}*/
function startGame(deck){
  if(!gamestarted)
  {
    gamestarted = true;
    console.log('game start')
    
    let usernames = Array.from(players.keys())
    let user = usernames[Math.floor(Math.random() * usernames.length)]
    asker = {user:user, sock:players.get(user)}
    io.to(asker.sock).emit('set_asker')

    teamA = new Array()
    teamB = new Array()
    setTeams();
    teamA.forEach(e => 
      {
        io.to(players.get(e)).emit('setTeams', {t:teamA, o:teamB})
        io.to(players.get(e)).emit('team', 'A')
        playerteams.set(e, 'A')
      }
    )
    teamB.forEach(e => 
      {
        io.to(players.get(e)).emit('setTeams', {t:teamB, o:teamA})
        io.to(players.get(e)).emit('team', 'B')
        playerteams.set(e, 'B')
      }
    )

    halfSuitsInPlay = populateHalfSuits()
    io.emit('update_halfsuits', Array.from(halfSuitsInPlay).filter(([key, value]) => value.play));

    let n = 0;
    for(let [player, socket] of players.entries())
    {
      let split = new Set(deck.slice(9*n, 9*(n+1)))
      split.forEach(element => cardplayers.set(element,player))
      playercards.set(player, split)
      io.to(socket).emit('init_cards', Array.from(split).map((item) => (DECK[item])))
      n+=1
    }
    io.emit('set_scores', scores)
    io.emit('startgame')
  }
  //io.emit('TEAMS', playerteams)
}

function gameReset() {
  if(gamestarted)
  {
    gamestarted=false
    console.log('reset')

    io.emit('setTeams', {t:[], o:[]})

    //playDeck = Array(54).fill().map((element,index)=>index);
    playDeck = shuffleDeck();
    scores = {A:0, B:0}

    io.to(asker.sock).emit('unset_asker')
    asker = null;

    io.emit('update_halfsuits', [])
    io.emit('endgame')
}
}

function checkUser(name){
  return !players.has(name);
}

function populateHalfSuits(){
  let M = new Map();
  let i = 0;
  for(let s of suitMAP.keys())
  {
    M.set(`L ${s}`, {cards: DECK.slice(i,i+6), play:true });
    M.set(`H ${s}`, {cards: DECK.slice(i+6,i+12), play:true });
    i+=12
  }
  M.set('8 Joke', {cards: DECK.slice(48,54), play:true})
  return M;
}

function handleRequest(request, socket){
  //WHEN THERE AREN't 6 PLAYERS, the wrong error may show up as not all cards are assigned
  let asker = sockets.get(socket.id)
  let card_ind = getCard({value:request.val, suit:request.suit});
  console.log(request);
  console.log(card_ind)
  let messages = new Array()
  if(cardplayers.get(card_ind) === -1)
  {
    io.to(socket.id).emit('warning', 'the half suit this card belongs to has been called')
  }
  else if(cardplayers.get(card_ind) === asker)
  {
    io.to(socket.id).emit('warning', 'you already possess this card')
  }
  else if(!hasHalfSuit(asker,card_ind))
  {
    io.to(socket.id).emit('warning', 'you do not own the half suit this card belongs to')
    console.log('does not own half suit')
  }
  else if(cardplayers.get(card_ind) !== request.player)
  {
    messages.push({name: 'Server', 
    message: `${asker} asked ${request.player}
    for ${request.val} ${request.suit}`})
    messages.push({name: 'Server', message: `${request.player} does not have ${request.val} ${request.suit}`})
    io.to(socket.id).emit('unset_asker')
    io.to(players.get(request.player)).emit('set_asker')
  }
  else{
    console.log('success')
    messages.push({name: 'Server', 
    message: `${asker} asked ${request.player}
    for ${request.val} ${request.suit}`})
    messages.push({name: 'Server', message: `${request.player} gave ${request.val} ${request.suit} to ${asker} `})
    playercards.get(request.player).delete(card_ind)
    playercards.get(asker).add(card_ind)
    cardplayers.set(card_ind, asker)
    io.to(socket.id).emit('init_cards', Array.from(playercards.get(asker)).map((card) => DECK[card]))
    io.to(players.get(request.player)).emit('init_cards', Array.from(playercards.get(request.player)).map((card) => DECK[card]))
  }
  io.emit('messages', messages)
}

function handleCall(data, socket){
  let caller = sockets.get(socket.id);
  let valid = true;
  let messages = new Array();
  for(let i = 0; i < data.assignments.length; i++)
  {
    let card = JSON.parse(data.assignments[i][0])
    let card_ind = getCard(card);
    let p = data.assignments[i][1];
    messages.push({name:'Server', message:`${caller} claims ${p} has ${card.value} ${card.suit}`})
    
    //TO REMOVE WHEN COMPLETED
    if(!cardplayers.has(card_ind))
      continue
    
    if(cardplayers.get(card_ind) !== p)
    {
      valid = false
    }
    let owner = cardplayers.get(card_ind)
    
    playercards.get(owner).delete(card_ind)
    cardplayers.set(card_ind, -1)
    
    io.to(players.get(owner)).emit('init_cards', Array.from(playercards.get(owner)).map((c) => DECK[c]))
  }
  //TO REMOVE
  console.log(cardplayers)
  if(valid)
  {
    scores[playerteams.get(caller)] += 1
    messages.push({name:'Server', message:`${caller} successfully called halfsuit ${data.halfsuit}`})
  }
  else
  {
    if(playerteams.get(caller) === 'A')
      scores['B'] += 1;
    else
      scores['A'] += 1;
      messages.push({name:'Server', message:`${caller} incorrectly called halfsuit ${data.halfsuit}`})

  }
  io.emit('messages', messages)
  io.emit('set_scores', scores)
  
  halfSuitsInPlay.get(data.halfsuit)['play'] = false;
  io.emit('update_halfsuits', Array.from(halfSuitsInPlay).filter(([key, value]) => value.play));
}

var teamA;
var teamB;
var scores = {A: 0, B:0};
const players = new Map(); //map name to socket
const sockets = new Map(); //map socket to usernames
const suitMAP = new Map([["C", 1], ["D", 2], ["H", 3], ["S", 4]]);
const valsMAP = new Map([["2", 1], ["3", 2], ["4", 3], ["5", 4], ["6", 5], ["7", 6], ["9", 7], ["10", 8], ["J", 9], ["Q", 10], ["K", 11], ["A", 12]])
const DECK = getDeck(); //shuffled deck of cards
const HALFSUITS = getHalfSuits();
var halfSuitsInPlay;

//var playDeck = Array(54).fill().map((element,index)=>index);
var playDeck = shuffleDeck();
const playercards = new Map(); //store the cards each player has
const cardplayers = new Map(); //store the player each belongs to
const  playerteams = new Map(); //store the teams each player is on
var gamestarted = false;
var host = null;
var asker = null;


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
    console.log('user connected');

    //on disconnect, remove the user and reset host if host leaves
    socket.on('disconnect', () => {
        console.log('user disconnected')
        players.delete(sockets.get(socket.id));
        sockets.delete(socket.id);
        if(host === socket.id)
          host = null;
        io.emit('update_users', Array.from(players.keys()))
        gameReset();
        console.log(Array.from(players.keys()));
        
    });
    
    //relay message to all users
    socket.on('message', msg => {
      console.log(msg.message);
      io.emit('message', msg);
    });

    //check if username is unique
    socket.on('set_username', (name)=>{
      if(checkUser(name))
      {
        io.to(socket.id).emit('user_set');
        if(host === null)
        {
          host = socket.id;
          io.to(host).emit('sethost')
        }
        sockets.set(socket.id, name);
        players.set(name, socket.id);
        io.emit('update_users', Array.from(players.keys()));
        console.log(Array.from(players.keys()))
      }
      else
      {
        io.to(socket.id).emit('invalid_user')
        console.log('user taken')
      }
    });

    //handle card requests on a given turn
    socket.on('request', (request) => {
      handleRequest(request, socket);
      
      
    })

    socket.on('callHalfSuit', (data) => {
      handleCall(data, socket);

    })

    socket.on('startgame', ()=>{
      startGame(playDeck);
    })
    socket.on('endgame', ()=>{
      gameReset();
    })
});

server.listen(3001, () => {
  console.log('listening on port 3000');
});