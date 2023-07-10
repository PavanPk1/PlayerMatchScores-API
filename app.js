const sqlite3 = require("sqlite3");
const { open } = require("sqlite"); //connecting to db
const express = require("express"); //connecting to server
const path = require("path");
const databasePath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
const app = express();
app.use(express.json());
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//API 1
const convertPlayersTableToCamelCase = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};
app.get("/players/", async (request, response) => {
  const getAllPlayers = `SELECT * FROM player_details;`;
  const players = await db.all(getAllPlayers);
  response.send(players.map(convertPlayersTableToCamelCase));
});
//API 2
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerDetails = `SELECT * FROM player_details 
    WHERE player_id = ${playerId};`;
  const player = await db.get(getPlayerDetails);
  response.send(convertPlayersTableToCamelCase(player));
});
//API 3
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerDetails = `UPDATE player_details
  SET player_name = '${playerName}' WHERE 
    player_id = ${playerId};`;
  await db.run(updatePlayerDetails);
  response.send("Player Details Updated");
});
//API 4
function convertMatchDetailsToCamelCase(dbObject) {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
}
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `SELECT * FROM match_details WHERE
  match_id = ${matchId};`;
  const match = await db.get(getMatchDetails);
  response.send(convertMatchDetailsToCamelCase(match));
});
//API 5
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
    SELECT match_details.match_id, match_details.match, match_details.year
    FROM match_details
    INNER JOIN player_match_score
    ON match_details.match_id = player_match_score.match_id
    WHERE player_match_score.player_id = ${playerId};`;
  const matches = await db.all(getPlayerMatchesQuery);
  response.send(matches.map(convertMatchDetailsToCamelCase));
});
//API 6
app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getSpecificMatch = `
    SELECT player_details.player_id as playerId, player_details.player_name as
    playerName FROM player_details JOIN player_match_score on player_details.player_id = 
    player_match_score.player_id where player_match_score.match_id = ${matchId};`;
  const matches = await db.all(getSpecificMatch);
  response.send(matches);
});
//API 7
app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const query = `
    SELECT player_match_score.player_id as playerId,
    player_details.player_name as playerName,
    sum(player_match_score.score) as totalScore,
    sum(player_match_score.fours) as totalFours,
    sum(player_match_score.sixes) as totalSixes
    FROM player_match_score JOIN player_details ON
    player_match_score.player_id = player_details.player_id WHERE 
    player_details.player_id = ${playerId}
    GROUP BY player_details.player_id;`;
  const statisticsOfPlayer = await db.get(query);
  response.send(statisticsOfPlayer);
});

module.exports = app;
