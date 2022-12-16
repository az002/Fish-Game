import React, {useEffect, useRef, useState} from 'react';
import io from 'socket.io-client';
import './App.css';
import Select from 'react-select'
import Popup from 'reactjs-popup'
//import axios from 'axios'


const socket = io('http://localhost:3001', {autoConnect:false});
socket.connect();

const SUIT = [
	{ value: 'C', label: 'Clubs', name: 'suit'},
	{ value: 'H', label: 'Hearts', name: 'suit'},
	{ value: 'D', label: 'Diamonds', name: 'suit'},
	{ value: 'S', label: 'Spades', name: 'suit'},
	{ value: '*', label: 'Jokers', name: 'suit'}
];

const VALS = ["2", "3", "4", "5", "6", "7", 
"8", "9", "10", "J", "Q", "K", "A","Big Joker", "Small Joker"]

const VALoptions = VALS.map((e) => {return({value:e, label:e, name:'val'})})

function App() {
	const bottomRef = useRef();
	const [ calling, setCalling ] = useState(false)
	const [ state, setState ] = useState({ message: "", name: "" })
	const [ chat, setChat ] = useState([]) //TODO: make this a queue to limit chat size; also make autoscroll
	const [ users, setUsers] = useState([])
	const [ teams, setTeams] = useState({teammates:[], opponents:[]})
	const [ asker, setAsker] = useState(false);
	const [ host, setHost ] = useState(false);
	const [ gamestart, setStart] = useState(false);
	const [ request, setRequest] = useState({player:'', val:'', suit:''})
	const [ callHalfSuit, setCall] = useState({halfsuit: [], assignments: new Map()})
	const [ halfsuits, setHalfsuits] = useState([])
	const [ myCards, setMyCards] = useState({C:[], H:[], D:[], S:[], Jokers:[]})
	const [ TEAM, setTEAM ] = useState('')
	const [ scores, setScores ] = useState({A: 0, B: 0})
	const nameSet = useRef(false);

	useEffect(
		() => {
			socket.on('initiateCall', () => {
				setCalling(true)
			})
			socket.on('endCall', () => {
				setCalling(false)
			})
		}, [ calling ]
	)
	useEffect(
		()=>{
			socket.on('team', (data) => {
				setTEAM(data)
			})
		},[ TEAM ]
	)
	useEffect(
		()=>{
			socket.on('set_scores', (data) => {
				setScores(data)
			})
		},[ scores ]
	)
	useEffect(
		() => {
			socket.on('user_set', () => {
				nameSet.current = true;
			})
			socket.on('invalid_user', () => {
				window.alert('invalid username')
			})
			socket.on('warning', (msg) => {
				window.alert(msg)
			})
		}, [  ]
	)
	
	useEffect(
		()=>{
			socket.on('startgame',()=>{
				setStart(true)
			})
			socket.on('endgame',()=>{
				setStart(false)
			})
		}, [ gamestart ]
	)

	useEffect(
		()=>{
			socket.on('init_cards', (data) => {
				const newCards = {C:[], H:[], D:[], S:[], Jokers:[]};
				data.forEach((card) => {
					let s = card.suit;
					if(s === '*')
						s = 'Jokers'
					newCards[s].push(card)
				})
				setMyCards(newCards)

			})
			console.log(myCards)
		}, [ myCards ]
	)

	useEffect(
		()=>{
			socket.on('update_halfsuits', (hsuits) => {
				setHalfsuits(hsuits)
			})
			console.log(halfsuits)
		}, [halfsuits]
	)

	useEffect(
		()=>{
			socket.on('setTeams',(TEAMS) => {
				setTeams({teammates:TEAMS.t, opponents:TEAMS.o})
			})
			console.log(teams)
		}, [ teams ]
	)

	useEffect(
		() => {
			socket.on("message", ({ name, message }) => {
				setChat([ ...chat, { name, message } ])
			})
			socket.on('messages', (data) => {
				setChat([...chat,...data])
			})
			if(nameSet.current)
				toBottom()
		},
		[ chat ]
	)

	useEffect(
		()=>{
			socket.on('update_users', (data)=>{
				setUsers(data)
			})
			console.log(users)
		}, [ users ]
	)

	useEffect(()=>{
		socket.on('sethost', ()=>{
			setHost(true);
		})
	},[ host ])
	
	useEffect(()=>{
		socket.on('set_asker', ()=>{
			setAsker(true);
		})
		socket.on('unset_asker',()=>{
			setAsker(false);
		})
	},[ asker ])
	
	const toBottom = () => {
		bottomRef.current.scrollIntoView({
			block: 'start',
		})
	}

	const onTextChange = (e) => {
		setState({ ...state, [e.target.name]: e.target.value })
	}

	const onMessageSubmit = (e) => {
		e.preventDefault()
		const { name, message } = state
		socket.emit("message", { name, message })

		setState({ message: "", name })
	}

	const renderChat = () => {
		return chat.map(({ name, message }, index) => (
				<h3 key={index} style={{margin:'15px 0px'}}>
					<span style={{position:'relative', left:'10px'}}>{name}: {message}</span>
				</h3>
		))
	}

	const renderUsers = () => {
		const t = new Set(teams.opponents);
		return users.map((u, index) => {
			let col = {color:'blue'}
			if(t.has(u))
				col = {color:'red'}
			return(
				<div key={index} style={col}>
					{u}
				</div>
			)
	})
	}

	const handleAskChange = (e) => {
		setRequest({...request, [e.name]: e.value})
	}
	
	const submitRequest = (e) => {
		e.preventDefault()
		console.log(request)
		if(asker)
		{
			socket.emit('request', request)
		}
		else
		{
			window.alert('not your turn')
		}
	}
	const handleCall = (e) => {
		setCall({[e.name]: e.value, assignments: new Map()})
	}
	const renderCall = () => {
		if(gamestart && !calling)
		{
			return(
			<Popup
						onOpen={()=>socket.emit('initiateCall')}
						onClose={()=>socket.emit('endCall')}
						trigger={<button className="button"> Call Half Suit </button>}
						modal
						nested
					>
						{close => (
						<div className="modal">
							<button className="close" onClick={close}>
							&times;
							</button>
							<div className="header"> Call Half Suit </div>
							<div className="content">
							{' '}
							Select the desired halfsuit and assign each card to your team
							<br />
							<br />
							{renderHalfSuits()}
							{renderCallForm()}
							</div>
							<div className="actions">
							
							<button
								className="button"
								onClick={() => {
								setCall({...callHalfSuit, assignments: new Map()})
								close();
								}}
							>
								close modal
							</button>
							</div>
						</div>
						)}
					</Popup>
			)
		}
		else if(calling)
		{
			return(
				<h3>Player is calling a half suit</h3>
			)
		}
	}

	const cardAssignment = (e) => {
		let new_assignment = callHalfSuit.assignments;
		new_assignment.set(e.value.card, e.value.player);
		setCall({...callHalfSuit, assignments:new_assignment})
	}

	const submitCall = (e) => {
		e.preventDefault();
		if(callHalfSuit.assignments.size !== 6)
		{
			alert('please assign every card to a player')
		}
		else
		{
			let CallData = Array.from(callHalfSuit.assignments)
			socket.emit('callHalfSuit', {halfsuit: callHalfSuit.halfsuit[0], assignments:CallData})
			setCall({...callHalfSuit, assignments:new Map()})
		}
		

	}

	const renderCallForm = () => {
		if(teams.teammates.length !== 0 && callHalfSuit.halfsuit.length !== 0)
		{
			let T = teams.teammates;
			let C = callHalfSuit.halfsuit[1].cards.map((card) => JSON.stringify(card))
			let FORM = C.map((card, i) => {
				let players = T.map((player, j) => {
					return(
						{value: {player:player, card:card}, label: player, name: 'assignment'}
					)
				})
				
				return(
					
					<label key={i}>
						{JSON.parse(card).value} {JSON.parse(card).suit}
						<Select options={players}
						value={{label:callHalfSuit.assignments.get(card)}}
						onChange={cardAssignment}/>
					</label>
					
				)
			})
			return(
				<form onSubmit={submitCall}>
					{FORM}
					<button>Submit</button>
				</form>
			)
		}
	}


	const renderHalfSuits = () => {
		let hList = halfsuits.map((item, i) => {
			return(
				{value: item, label: item[0], name: 'halfsuit'}
			)
		})
		return(
			<Select options={hList}
			value={{label:callHalfSuit.halfsuit[0]}}
			onChange={handleCall}/>
		)
	}
	const renderAsk = () => {
		let uList = teams.opponents.map((item, i) => {
			return(
				{value: item, label: item, name:'player'}
			)
		})

		if(!calling)
		{
		return (
			<div className='card' id='ask'>
				<h3>Ask</h3>
				<Select options={uList}
				value={{label:request.player}}
				onChange={handleAskChange}/>
				<h3>For</h3>
				<Select options={VALoptions}
				value={{label:request.val}}
				onChange={handleAskChange}/>
				<h3>Of</h3>
				<Select options={SUIT}
				value={{label:request.suit}}
				onChange={handleAskChange}/>
				<button onClick={submitRequest}>Submit</button>
			</div>
		)}
		else
		{
			return(
				<div className = 'card' id='ask'>
					<h3> Player is calling half suit</h3>
				</div>
			)
		}
	}


	const onStart = (e) => {
		e.preventDefault();
		if(users.length === 6)
			socket.emit('startgame');
		else
			window.alert("Not enough players")
		
	}

	const onEnd = (e) => {
		e.preventDefault();
		setRequest({player:'', val:'', suit:''});
		setCall({halfsuit: [], assignments: new Map()})
		setMyCards({C:[], H:[], D:[], S:[], Jokers:[]})
		socket.emit('endgame');
	}
	const renderCards = () => {
		if(gamestart){
			let C = Object.entries(myCards)
			let CARDS = C.map(([a,b],i) => {
				let a_cards = b.map((card, j) => {
					return(
						<li key={j} style={{display:'inline-block', margin:'5px'}}>{card.value}</li>
					)
				})
				return(
					<label key={i}>
						{a}
						<ul>
							{a_cards}
						</ul>
					</label>
				)
			})
			return(
				<div>
					<h2>Your Cards</h2>
					{CARDS}
				</div>
			)
		}
	}
	const hostStartGame = () => {
		if(host === true)
		{
			if(gamestart)
			{
				return(
					<div>
						<h2>You are the host</h2>
						<button onClick={onEnd}>End Game</button>
					</div>);
			}
			else
			{
				return(
					<div>
						<h2>You are the host</h2>
						<button onClick={onStart}>Start Game</button>
					</div>);
			}
		}
		return(<div></div>);
	}
	

	const Turn = () => {
		if(asker === true)
			return(
				<div>
					<h2> Your Turn</h2>
				</div>
			)
			return (<div></div>)
	}


	const chatbox = () => {
		return(
			<form onSubmit={onMessageSubmit} id='appform'>
				<input id="appinput" 
					autoComplete="off" 
					name="message"
					onChange={(e) => onTextChange(e)}
					value={state.message}
					/>
				<button>Send</button>
			</form>
			
		)
	}

	const scoreboard = () => {
		return(
			<div className='card' id='scoreboard'>
				<div id='1' style={{flexGrow:1, textAlign:'center'}}>
					<span style={{color:TEAM === 'A' ? 'orange' : 'black'}}>Team A:</span> &nbsp; {scores.A}
				</div>
				<div id='1' style={{flexGrow:1, textAlign:'center'}}>
				<span style={{color:TEAM === 'B' ? 'orange' : 'black'}}>Team B:</span> &nbsp; {scores.B}
				</div>
			</div>
		)
	}

	const gameUI = () => {
		return (
			<div>
				<div className="card-container">
					
					<div className="card" id='chatlog'>
						<span style={{position:'relative', left: '10px', top:'10px'}}>Chat</span>
						{renderChat()}
						<div ref={bottomRef}></div>
					</div>
					<div className='card'>
						<h1>Users</h1>
						{renderUsers()}
					</div>
					<div className='card' id='chatbox'>
						{chatbox()}
					</div>
					{scoreboard()}
					{renderAsk()}
					
					<div className='card'>
						{hostStartGame()}
						{Turn()}
						{renderCall()}
					</div>
					<div className='card'>
						{renderCards()}
					</div>
				</div>
			</div>
			
		)
	}
	const handlesubmit = (e) => {
		e.preventDefault();
		socket.emit('set_username', state.name);
	}
	const login = () => {
		return(
			<div>
				<form id="appform" onSubmit={handlesubmit}
				style={{width:'50%', margin:'auto'}} >
					<input id="appinput" 
					autoComplete="off" 
					placeholder='Username'
					name="name"
					onChange={(e) => onTextChange(e)}
					value={state.name}
					autoFocus='on'
					/><button>Send</button>
				</form>
			</div>
		)
	}
	const display = () => {
		if(nameSet.current)
			return(gameUI());
		return(login());
	}

	return(
		<div>
			{display()}
		</div>
	)
	
}

export default App
