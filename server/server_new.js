const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { reset } = require("nodemon");
const server = http.createServer(app);

app.use(cors());

//changes made: eliminated playdeck, keys are json.stringify cards

const suits = ['C','D','H','S']
const lowvals = ['2','3','4','5','6','7']
const highvals = ['9','10','J','Q','K','A']

var teamA = [];
var teamB = [];
var scores = {A: 0, B:0};

const players = new Map(); //map name to socket
const sockets = new Map(); //map socket to usernames

var DECK = getDeck(); //shuffled deck of cards
const halfSuitsInPlay = populateHalfSuits(DECK); //
const HALFSUITS = getHalfSuits(DECK);


const playercards = new Map(); //store the cards each player has
const cardplayers = new Map(); //store the player each belongs to
const  playerteams = new Map(); //store the teams each player is on
var gamestarted = false;
var host = null;



function getDeck() {
  /*Initalize deck*/
  let deck = new Array();
  suits.forEach(
    s => {
      lowvals.forEach( val => deck.push({value: val, suit: s}))
      highvals.forEach( val => deck.push({value: val, suit: s}))
    }
  )

  suits.forEach(
    s => deck.push({value:'8', suit: s})
  )

  deck.push({ value: "Big Joker", suit: "*" })
  deck.push({ value: "Small Joker", suit: "*" })
  return deck;
}

function shuffleDeck(deck) {
  for (let i = 0; i < 1000; i++) {
      let l1 = Math.floor((Math.random() * deck.length));
      let l2 = Math.floor((Math.random() * deck.length));
      let tmp = deck[l1];
      deck[l1] = deck[l2];
      deck[l2] = tmp;
  }
}

function getHalfSuits(deck) {
  /*map each card to the half suit it belongs to*/
  let halfsuits = new Map();
  for (let i = 0; i < deck.length; i++) {
      let index = Math.floor(i/6)
      halfsuits.set(JSON.stringify(deck[i]), deck.slice(6*index, 6*index + 6));
  }
  return halfsuits;
}

function populateHalfSuits(deck){
  //initialize halfsuits in play
  let M = new Map();
  let i = 0;
  for(let s of suits)
  {
    M.set(`L ${s}`, {cards: deck.slice(i,i+6), play:true });
    M.set(`H ${s}`, {cards: deck.slice(i+6,i+12), play:true });
    i+=12
  }
  M.set('8 Joke', {cards: deck.slice(48,54), play:true})
  return M;
}

function hasHalfSuit(player,card){
  //check if player has halfsuit of card
  let halfsuit = HALFSUITS.get(card);
  for(let i = 0; i < halfsuit.length; i++){
      if(cardplayers.get(JSON.stringify(halfsuit[i])) === player)
          return true
  }
  return false
}

function setTeams() {
  //randomly assign players to teams
  let usernames = Array.from(players.keys())
  let indices = Array(usernames.length).fill().map((e,i) => i)
  for(let i = 0; i < 20; i++)
  {
    let l1 = Math.floor(Math.random() * indices.length);
    let l2 = Math.floor(Math.random() * indices.length);
    let tmp = indices[l1];
    indices[l1] = indices[l2];
    indices[l2] = tmp;
  }
  for(let i = 0; i < usernames.length; i++)
  {
    if(i % 2 === 0)
    {
      teamA.push(usernames[indices[i]])
    }
    else
    {
      teamB.push(usernames[indices[i]])
    }
  }
}

function startGame(){
  if(!gamestarted)
  {
    gamestarted = true;
    console.log('game start')
    
    shuffleDeck(DECK)
    io.emit('update_halfsuits', Array.from(halfSuitsInPlay).filter(([key, value]) => value.play));

    let n = 0;
    for(let [player, socket] of players.entries())
    {
      let split = DECK.slice(9*n, 9*(n+1))
      //console.log(split)
      split.forEach(element => cardplayers.set(JSON.stringify(element),player))
      playercards.set(player, new Set(split.map((e,i) => JSON.stringify(e))))
      io.to(socket).emit('init_cards', split)
      n+=1
    }

    let usernames = Array.from(players.keys())
    let user = usernames[Math.floor(Math.random() * usernames.length)]
    io.to(players.get(user)).emit('set_asker')

    teamA = new Array()
    teamB = new Array()
    setTeams();

    console.log(teamA)
    console.log(teamB)
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

    io.emit('startgame')
  }
}

function gameReset() {
  if(gamestarted)
  {
    gamestarted=false
    console.log('reset')

    io.emit('setTeams', {t:[], o:[]})

    scores = {A:0, B:0}
    io.emit('set_scores', scores)

    for(let k of halfSuitsInPlay.keys())
      halfSuitsInPlay.get(k).play = true;
    io.emit('unset_asker')
    io.emit('endCall')
    io.emit('endgame')
  }
}

function checkUser(name){
  return !players.has(name);
}

function handleRequest(request, socket){
  let asker = sockets.get(socket.id)
  let card = JSON.stringify({value:request.val, suit:request.suit})
  console.log(request);
  console.log(card)

  let messages = new Array()
  if(cardplayers.get(card) === -1)
  {
    io.to(socket.id).emit('warning', 'the half suit this card belongs to has been called')
  }
  else if(cardplayers.get(card) === asker)
  {
    io.to(socket.id).emit('warning', 'you already possess this card')
  }
  else if(!hasHalfSuit(asker,card))
  {
    io.to(socket.id).emit('warning', 'you do not own the half suit this card belongs to')
    console.log('does not own half suit')
  }
  else if(cardplayers.get(card) !== request.player)
  {
    messages.push(
      {
        name: 'Server', 
        message: `${asker} asked ${request.player} for ${request.val} ${request.suit}`
      }
    )
    messages.push(
      {
        name: 'Server', 
        message: `${request.player} does not have ${request.val} ${request.suit}`
      }
    )
    io.to(socket.id).emit('unset_asker')
    io.to(players.get(request.player)).emit('set_asker')
  }
  else{
    console.log('success')
    messages.push(
      {
        name: 'Server', 
        message: `${asker} asked ${request.player} for ${request.val} ${request.suit}`
      }
    )
    messages.push(
      {
        name: 'Server', 
        message: `${request.player} gave ${request.val} ${request.suit} to ${asker}`
      }
    )
    playercards.get(request.player).delete(card)
    playercards.get(asker).add(card)
    cardplayers.set(card, asker)
    io.to(socket.id).emit('init_cards', Array.from(playercards.get(asker)).map(e => JSON.parse(e)))
    io.to(players.get(request.player)).emit('init_cards', Array.from(playercards.get(request.player)).map(e => JSON.parse(e)))
  }
  io.emit('messages', messages)
}

function handleCall(data, socket){
  let caller = sockets.get(socket.id);
  let valid = true;
  let messages = new Array();
  for(let i = 0; i < data.assignments.length; i++)
  {
    let card = data.assignments[i][0]
    let parsed_card = JSON.parse(card)
    let p = data.assignments[i][1];
    messages.push({name:'Server', message:`${caller} claims ${p} has ${parsed_card.value} ${parsed_card.suit}`})
    
    if(cardplayers.get(card) !== p)
    {
      valid = false
    }
    let owner = cardplayers.get(card)
    
    playercards.get(owner).delete(card)
    cardplayers.set(card, -1)
    
    io.to(players.get(owner)).emit('init_cards', Array.from(playercards.get(owner)).map((e) => JSON.parse(e)))
  }

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

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
    console.log(`${socket.id} connected`)

    //on disconnect, remove the user and reset host if host leaves
    socket.on('disconnect', (reason) => {
        console.log(`${socket.id} disconnected`)
        players.delete(sockets.get(socket.id));
        sockets.delete(socket.id);
        if(host === socket.id)
        {
          host = null;
          if(players.size !== 0)
          {
            host = Array.from(players.values())[Math.floor(players.size*Math.random())]
            io.to(host).emit('sethost')
          }
        }
        io.emit('update_users', Array.from(players.keys()))
        gameReset();
        console.log(Array.from(players.keys()));
        
    });
    
    //send message to all users
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
    socket.on('request', (request) => {
      handleRequest(request, socket);
    })
    socket.on('callHalfSuit', (data) => {
      handleCall(data, socket);
    })
    socket.on('startgame', ()=>{
      startGame();
    })
    socket.on('endgame', ()=>{
      gameReset();
    })
    socket.on('initiateCall', () => {
      socket.broadcast.emit('initiateCall')
      io.emit('message', `${sockets.get(socket.id)} is calling`)
    })
    socket.on('endCall', () => {
      io.emit('endCall')
    })
});

server.listen(3001, () => {
  console.log('listening on port 3000');
});