import { world, system } from "@minecraft/server";
import * as mc from "@minecraft/server";
import ScoreboardM from "./scoreboardM.js";

// * ====================================================
// * Constants
// * ====================================================
const helpMenu = `§7===== §fCommand HELP §7=====
§aspawn/reset§7: Back to Start
§acp§7: Return last checkpoint
§astage§7: Display Stage Board
§atime§7: Display Time Board`;

const pressurePlateLocation = [
  { name: "Start", location: { x: -1, y: -57, z: 0 } },
  { name: "Checkpoint1", location: { x: 29, y: -57, z: 0 } },
  { name: "Checkpoint2", location: { x: 59, y: -57, z: 0 } },
  { name: "Checkpoint3", location: { x: 74, y: -57, z: 0 } },
  { name: "End", location: { x: 89, y: -57, z: 0 } },
];

const colors = {
  black: "§0",
  darkBlue: "§1",
  darkGreen: "§2",
  darkAqua: "§3",
  darkRed: "§4",
  darkPurple: "§5",
  gold: "§6",
  gray: "§7",
  darkGray: "§8",
  blue: "§9",
  green: "§a",
  aqua: "§b",
  red: "§c",
  lightPurple: "§d",
  yellow: "§e",
  white: "§f",
};

const ranks = {
  guest: { order: 1, display: "§7[§fGuest§7]" },
  member: { order: 2, display: "§7[§aMember§7]" },
  complete: { order: 3, display: "§7[§aComplete§7]" },
  vip: { order: 4, display: "§7[§bVIP§7]" },
  mvp: { order: 5, display: "§7[§6MVP§7]" },
  owner: { order: 6, display: "§7[§cOwner§7]" },
};

const customCommands = {
  spawn: (player) => player.teleport({ x: 0, y: -57, z: 0 }),
  reset: (player) => player.teleport({ x: 0, y: -57, z: 0 }),
  gmc: (player) => player.runCommand(`gamemode creative ${player.name}`),
  gms: (player) => player.runCommand(`gamemode survival ${player.name}`),
  stage: (player) =>
    player.runCommandAsync("scoreboard objectives setdisplay sidebar Stage"),
  time: (player) =>
    player.runCommandAsync("scoreboard objectives setdisplay sidebar Time"),
  leader: (player) =>
    player.runCommandAsync(
      "scoreboard objectives setdisplay sidebar Leaderboard"
    ),
  cp: (player) => {
    // Get the player's stage from the scoreboard
    let player_stage = ScoreboardM.getScore(player, "Stage");
    if (player_stage === undefined) {
      world.sendMessage(`You have not started the game yet.`);
      return;
    }

    let location = pressurePlateLocation[player_stage].location;
    player.teleport(location);
  },
  leaderClr: (player) => {
    ScoreboardM.delObj("Leaderboard");
  }
};

// * ====================================================
// * Main Tick
// * ====================================================
system.run(mainTick);

function mainTick() {
  // if (system.currentTick % 10 === 0) {
  //   world.sendMessage("Hiiii");
  // }

  system.run(mainTick);
}

// * ====================================================
// * Send Message
// * ====================================================
function customCommand(command, player) {
  const commandToRun = customCommands[command];
  if (commandToRun) {
    system.run(() => {
      commandToRun(player);
    });
  }
}

function sendMessageWithRank(message, player) {
  // 1. Get the player's rank
  let player_ranks = player.getTags().filter((tag) => tag.startsWith("rank:"));
  if (player_ranks.length === 0) {
    player_ranks = ["rank:guest"];

    system.run(() => {
      player.addTag("rank:guest");
    });
  }

  player_ranks = player_ranks.map((rank) => rank.split(":")[1]);

  // Find the highest rank that the player has
  let player_rank = player_ranks.reduce((highestRank, rank) => {
    if (!ranks[rank]) {
      console.error(`Rank ${rank} does not exist in the ranks object.`);
      return highestRank;
    }
    return ranks[rank].order > ranks[highestRank].order ? rank : highestRank;
  }, "guest");

  // 2. Get the player's stage from the scoreboard
  let player_stage_score = ScoreboardM.getScore(player, "Stage");
  if (player_stage_score === undefined) {
    // Send the message with the player's rank
    world.sendMessage(
      `${ranks[player_rank].display} ${player.name}: ${message}`
    );
    return;
  }

  let location_name = pressurePlateLocation[player_stage_score].name;

  // Send the message with the player's rank and name
  world.sendMessage(
    `${ranks[player_rank].display} [Stage: ${location_name}] ${player.name}: ${message}`
  );
}

world.beforeEvents.chatSend.subscribe((msg) => {
  const { message, sender } = msg;

  msg.cancel = true; // Prevents the original message from being sent

  // * Custom Command
  const commandPrefix = "";
  if (message.startsWith(commandPrefix)) {
    const command = message.substring(commandPrefix.length).trim();
    customCommand(command, sender);
  }

  // * Message with rank
  // command: /tag @s add rank:Owner
  sendMessageWithRank(message, sender);
});

// * ====================================================
// * World Init / Scoreboard
// * ====================================================

world.afterEvents.worldInitialize.subscribe(() => {
  ScoreboardM.hasObj("Stage")
    ? undefined
    : ScoreboardM.newObj("Stage", "=== Stage Progress ==="); // create new scoreboard
  ScoreboardM.hasObj("Time")
    ? undefined
    : ScoreboardM.newObj("Time", "=== Finish Time Record ==="); // create new scoreboard
  ScoreboardM.hasObj("Leaderboard")
    ? undefined
    : ScoreboardM.newObj("Leaderboard", "=== 🏆Leaderboard🏆 ==="); // create new scoreboard
});

// * ====================================================
// * Pressure Plate
// * ====================================================

let runID;

function timeCounting(i, player) {
  // Time counting
  switch (i) {
    case 0:
      if (runID) {
        system.clearRun(runID);

        ScoreboardM.setScore(player, "Time", 0); // set time score

        runID = system.runInterval(() => {
          ScoreboardM.addScore(player, "Time", 1); // add time score

          let text = `§6Stage: §e${ScoreboardM.getScore(
            player,
            "Stage"
          )}\n§6Time: §e${ScoreboardM.getScore(player, "Time")}s`;
          player.onScreenDisplay.setActionBar(text);
        }, 20);
      } else {
        ScoreboardM.setScore(player, "Time", 0); // set time score
        runID = system.runInterval(() => {
          ScoreboardM.addScore(player, "Time", 1); // add time score
          let text = `§6Stage: §e${ScoreboardM.getScore(
            player,
            "Stage"
          )}\n§6Time: §e${ScoreboardM.getScore(player, "Time")}s`;
          player.onScreenDisplay.setActionBar(text);
        }, 20);
      }
      break;
    case 4:
      if (runID) {
        system.clearRun(runID);
        runID = null;

        // Get the player's best score from the leaderboard
        const bestScore = ScoreboardM.getScore(player, "Leaderboard");
        const currScore = ScoreboardM.getScore(player, "Time");
        // If the player's current stage is greater than their best score, update the leaderboard
        if (!bestScore || currScore < bestScore) {
          ScoreboardM.setScore(player, "Leaderboard", currScore);
        }
      }
      break;
  }
}

function stageHandler(current_block, player) {
  const current_blockLocation = JSON.stringify(current_block);

  for (let i = 0; i < pressurePlateLocation.length; i++) {
    const stageLocation = JSON.stringify(pressurePlateLocation[i].location);

    if (current_blockLocation === stageLocation) {
      // Get current stage tag if it exists
      const currentStageScore = ScoreboardM.getScore(player, "Stage");
      const currentStage = currentStageScore ? currentStageScore : -1;

      timeCounting(i, player);

      // Check if new stage is greater than current stage
      if (i > currentStage || i === 0) {
        // Set custom display title
        let title, subtitle;
        switch (i) {
          case 0:
            player.onScreenDisplay.setActionBar(helpMenu);
            title = "§o§6Get Ready! Go§r";
            subtitle = "";
            break;
          case 4:
            title = "§o§6Congratulations§r";
            subtitle = "";
            break;
          default:
            title = "§o§6Arrived Checkpoint§r";
            subtitle = `${i}`;
            break;
        }
        player.onScreenDisplay.setTitle(title, {
          stayDuration: 20,
          fadeInDuration: 2,
          fadeOutDuration: 4,
          subtitle: subtitle,
        });

        ScoreboardM.setScore(player, "Stage", i);
      } else {
        if (currentStage === -1 || currentStage === 4) {
          let title = `§c Parkour challenge haven't start, type 'spawn' to start the challenge`;
          player.onScreenDisplay.setActionBar(title);
        }
      }
      return;
    }
  }
}

mc.world.afterEvents.pressurePlatePush.subscribe((eventData) => {
  const player = eventData.source;
  const block = eventData.block;

  stageHandler(block.location, player);
});

// * ====================================================
// * Kill / death Scoreboard
// * ====================================================

const overworld = world.getDimension("overworld"),
  nether = world.getDimension("nether"),
  end = world.getDimension("the end");

overworld
  .runCommandAsync("scoreboard objectives add deaths dummy")
  .catch((error) => console.warn(error));
overworld
  .runCommandAsync("scoreboard objectives add kills dummy")
  .catch((error) => console.warn(error));
world.afterEvents.entityHurt.subscribe(
  ({ hurtEntity, damageSource }) => {
    /** @type {EntityHealthComponent} */
    // @ts-ignore
    const health = hurtEntity.getComponent("health");
    if (health.currentValue > 0) return;
    hurtEntity.runCommandAsync("scoreboard players add @s deaths 1");
    if (!(damageSource.damagingEntity instanceof Player)) return;
    damageSource.damagingEntity.runCommandAsync(
      "scoreboard players add @s kills 1"
    );
  },
  { entityTypes: ["minecraft:player"] }
);
