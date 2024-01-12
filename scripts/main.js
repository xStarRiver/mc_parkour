import * as server from '@minecraft/server'
import * as ui from '@minecraft/server-ui'

const spawnpoint = [ "-4 -57 0 "]
const checkpointLocation = [
  { name: "Get Started", location: { x: -1, y: -57, z: 0 } },
  { name: "Checkpoint 1", location: { x: 14, y: -57, z: 0 } },
  { name: "Checkpoint 2", location: { x: 29, y: -57, z: 0 } },
  { name: "Checkpoint 3", location: { x: 59, y: -57, z: 0 } },
  { name: "Checkpoint 4", location: { x: 74, y: -57, z: 0 } },
  { name: "The End", location: { x: 89, y: -57, z: 0 } },
];

const playerData = new Map();

server.world.afterEvents.pressurePlatePush.subscribe((eventData) => {
  const player = eventData.source;
  const block = eventData.block;
  const blockPosition = {
    x: Math.floor(block.location.x),
    y: Math.floor(block.location.y),
    z: Math.floor(block.location.z)
  };
  for (let checkpoint of checkpointLocation) {
    if (blockPosition.x === checkpoint.location.x && blockPosition.y === checkpoint.location.y && blockPosition.z === checkpoint.location.z) {
      if (checkpoint.name === "Get Started") {
        playerData.set(player.name, {
          startTime: Date.now(),
          lastUpdate: Date.now(),
          hasStarted: true 
        });
        coutTimer(player);
        startContinuousParticleEffect();
        activateCheckpoint(player, checkpoint);
      } else {
        
        const data = playerData.get(player.name);
        if (data && data.hasStarted) {
          activateCheckpoint(player, checkpoint);
        }
      }
      break; 
    }
  }
});

function activateCheckpoint(player, checkpoint) {
  const title = "§o§6" + checkpoint.name + "§r";
  player.onScreenDisplay.setTitle(title);
  player.runCommand(`playsound random.orb @s`);


  if (checkpoint.name === "The End") {
    const data = playerData.get(player.name);
    if (data) {
      data.reachedEnd = true;
      const elapsedTime = Math.floor((Date.now() - data.startTime) / 1000);
      player.onScreenDisplay.setActionBar(`§6Time: §e${elapsedTime} seconds`);
      player.onScreenDisplay.setTitle("§o§aCongratulations§r");
      player.runCommand(`playsound random.levelup @s`);
      player.runCommand(`summon fireworks_rocket`);
      player.runCommand(`particle minecraft:crop_growth_area_emitter ~ ~ ~`)

      stopTimer();
      stopContinuousParticleEffect();
    }
  }
}

let timer;
function coutTimer(player) {
  if (timer){
    server.system.clearRun(timer);
  }
  const data = playerData.get(player.name);
  if (data && !data.reachedEnd) {
  
    timer = server.system.runInterval(() => {
    const elapsedTime = Math.floor((Date.now() - data.startTime) / 1000);
    player.onScreenDisplay.setActionBar(`§6Time: §e${elapsedTime} seconds`);
    data.lastUpdate = Date.now();
  },20);
  }
}

function stopTimer(){
  if (timer){
    server.system.clearRun(timer);
    timer = null
  }
}


let particleEffectInterval;

function startContinuousParticleEffect() {
  particleEffectInterval = server.system.runInterval(() => {
    server.world.getPlayers().forEach(player => {
      player.runCommand(`execute as @a at @s run /particle minecraft:heart_particle ~ ~ ~`);
    });
  }, 1);
}

function stopContinuousParticleEffect() {
  if (particleEffectInterval) {
    server.system.clearRun(particleEffectInterval);
    particleEffectInterval = null;
  }
}

server.world.afterEvents.itemUse.subscribe((result) => { 
    if(result.itemStack.typeId == 'minecraft:compass') {
        const menu = new ui.ActionFormData()
            .title('Parkour Minigame')
            .body('Choose a parkour 1 to play')
            .button("Parkour 1", "textures/items/compass")
            .show(result.source)

            menu.then(fulfilled => {
              let selection = fulfilled.selection
              let spawnpoinst = spawnpoint[selection]
                if(spawnpoinst) {
                    result.source.runCommandAsync(`tp @s ${spawnpoint}`)
                }
            })
          }

    
    })
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
 