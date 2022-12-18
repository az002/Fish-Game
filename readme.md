# Fish Card Game
## Background
Online card game implemented using Reactjs and Websockets. Fish a card game for 6 players in which players are split into teams and compete to gain the most number of points by asking for cards from the opposing team.
## Rules
A 54 card deck is split into half suits, where for a given suit, the cards are split into two halves: 2-7 and 9-A. The remaining 8's and jokers form the last half suit. A team's goal is to collect as many half suits as possible.

The game starts with a random player asking for cards. The asker can only ask opponents for cards, and can only ask for cards in the half suit the asker owns. If the asker correctly asks for a card, the opponent must give the card to the asker and the asker may continue to ask any opponent for cards. Otherwise, the opponent becomes the asker. 

When a player is confident that their team has all of the cards in a halfsuit, they may "call" the half suit by matching every card in the halfsuit to its owner on the player's team. The calling player's teammates cannot assist as this occurs. If the player correctly matches every card, their team gains a point. Otherwise, the opposing team gains a point. For example, if the calling player's team in fact does not own every card in the half suit, it is guaranteed that the opposing team gains a point.