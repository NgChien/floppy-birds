var debugmode = false;

var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

// api
let matchId;
let isSubmit = false;

// Storage handling
let memoryStorage = {};

// Add new variables at the top of the file
let isProcessingTransaction = false;
let isProcessingGameStart = false;

function getStorageValue(key) {
   try {
      // Try localStorage first
      if (typeof localStorage !== 'undefined') {
         return localStorage.getItem(key) || memoryStorage[key] || "";
      }
   } catch (e) {
      console.warn('localStorage not available:', e);
   }
   return memoryStorage[key] || "";
}

function setStorageValue(key, value) {
   try {
      // Try localStorage first
      if (typeof localStorage !== 'undefined') {
         localStorage.setItem(key, value);
      }
   } catch (e) {
      console.warn('localStorage not available:', e);
   }
   // Always save to memory as backup
   memoryStorage[key] = value;
}

$(document).ready(function () {
   if (window.location.search == "?debug")
      debugmode = true;
   if (window.location.search == "?easy")
      pipeheight = 200;

   //get the highscore
   var savedscore = getStorageValue("highscore");
   if (savedscore != "")
      highscore = parseInt(savedscore);

   //start with the splash screen
   showSplash();
});

function showSplash() {
   currentstate = states.SplashScreen;

   //set the defaults (again)
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;

   //update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0 });
   updatePlayer($("#player"));

   soundSwoosh.stop();
   soundSwoosh.play();

   //clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = new Array();

   //make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');

   //fade in the splash
   $("#splash").html('');  // Remove splash-play button
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

async function startGame() {
   // Bỏ kiểm tra ví và bắt đầu game ngay lập tức
   startActualGame();
}

function startActualGame() {
   $("#deposit-withdraw").hide();
   currentstate = states.GameScreen;
   //fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');

   //update the big score
   setBigScore();

   //debug mode?
   if (debugmode) {
      //show the bounding boxes
      $(".boundingbox").show();
   }

   //start up our loops
   var updaterate = 1000.0 / 60.0; //60 times a second
   loopGameloop = setInterval(gameloop, updaterate);
   loopPipeloop = setInterval(updatePipes, 1400);

   //jump from the start!
   playerJump();
}

function updatePlayer(player) {
   //rotation
   rotation = Math.min((velocity / 10) * 90, 90);

   //apply rotation and position
   $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
   var player = $("#player");

   //update the player speed/position
   velocity += gravity;
   position += velocity;

   //update the player
   updatePlayer(player);

   //create the bounding box
   var box = document.getElementById('player').getBoundingClientRect();
   var origwidth = 34.0;
   var origheight = 24.0;

   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;

   //if we're in debug mode, draw the bounding box
   if (debugmode) {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }

   //did we hit the ground?
   if (box.bottom >= $("#land").offset().top) {
      playerDead();
      return;
   }

   //have they tried to escape through the ceiling? :o
   var ceiling = $("#ceiling");
   if (boxtop <= (ceiling.offset().top + ceiling.height()))
      position = 0;

   //we can't go any further without a pipe
   if (pipes[0] == null)
      return;

   //determine the bounding box of the next pipes inner area
   var nextpipe = pipes[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");

   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;

   if (debugmode) {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }

   //have we gotten inside the pipe yet?
   if (boxright > pipeleft) {
      //we're within the pipe, have we passed between upper and lower pipes?
      if (boxtop > pipetop && boxbottom < pipebottom) {
         //yeah! we're within bounds

      }
      else {
         //no! we touched the pipe
         playerDead();
         return;
      }
   }


   //have we passed the imminent danger?
   if (boxleft > piperight) {
      //yes, remove it
      pipes.splice(0, 1);

      //and score a point
      playerScore();
   }
}

//Handle mouse down OR touch start
if ("ontouchstart" in window) {
   $(document).on("touchstart", function(e) {
      screenClick(e);
   });
}
else {  
   $(document).on("mousedown", function(e) {
      screenClick(e);
   });   
}

//Handle space bar
$(document).keydown(function (e) {
   //space bar!
   if (e.keyCode == 32) {
      //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
      if (currentstate == states.ScoreScreen)
         $("#replay").click();
      else {
         screenClick(e);
      }
   }
});

function screenClick(e) {
   if (currentstate == states.GameScreen) {
      playerJump();
   }
   else if (currentstate == states.SplashScreen) {
      // Check if click is on buy ticket button
      const target = $(e.target);
      if (target.closest('#convert-container').length || target.closest('#deposit-withdraw').length) {
         return;
      }
      startGame();
   }
}

function playerJump() {
   velocity = jump;
   //play jump sound
   soundJump.stop();
   soundJump.play();
}

function setBigScore(erase) {
   var elemscore = $("#bigscore");
   elemscore.empty();

   if (erase)
      return;

   var digits = score.toString().split('');
   for (var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {
   var elemscore = $("#currentscore");
   elemscore.empty();

   var digits = score.toString().split('');
   fetchAccountData();
   for (var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {
   var elemscore = $("#highscore");
   elemscore.empty();

   var digits = highscore.toString().split('');
   for (var i = 0; i < digits.length; i++)
      elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
   var elemmedal = $("#medal");
   elemmedal.empty();

   if (score < 10)
      //signal that no medal has been won
      return false;

   if (score >= 10)
      medal = "bronze";
   if (score >= 20)
      medal = "silver";
   if (score >= 30)
      medal = "gold";
   if (score >= 40)
      medal = "platinum";

   elemmedal.append('<img src="assets/medal_' + medal + '.png" alt="' + medal + '">');

   //signal that a medal has been won
   return true;
}

async function playerDead() {
   if (!isSubmit && accountInfo) {
      isSubmit = true;
      try {
         await endMatch(accountInfo.walletAddress, matchId, score, '');
      } catch (er) { }
      isSubmit = false;
   }
   //stop animating everything!
   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');

   //drop the bird to the floor
   var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');

   //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
   currentstate = states.ScoreScreen;

   //destroy our gameloops
   clearInterval(loopGameloop);
   clearInterval(loopPipeloop);
   loopGameloop = null;
   loopPipeloop = null;

   //mobile browsers don't support buzz bindOnce event
   if (isIncompatible.any()) {
      //skip right to showing score
      showScore();
   }
   else {
      //play the hit sound (then the dead sound) and then show score
      soundHit.play().bindOnce("ended", function () {
         soundDie.play().bindOnce("ended", function () {
            showScore();
         });
      });
   }

   //update the highscore
   if(score > highscore) {
      highscore = score;
      setStorageValue("highscore", highscore, 999);
   }
}

function showScore() {
   //unhide us
   $("#scoreboard").css("display", "block");

   //remove the big score
   setBigScore(true);

   //update the scoreboard
   setSmallScore();
   setHighScore();
   var wonmedal = setMedal();

   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();

   //show the scoreboard
   $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
   $("#replay").css({ y: '40px', opacity: 0 });
   $("#scoreboard").transition({ y: '0px', opacity: 1 }, 600, 'ease', function () {
      //When the animation is done, animate in the replay button and SWOOSH!
      soundSwoosh.stop();
      soundSwoosh.play();
      $("#replay").transition({ y: '0px', opacity: 1 }, 600, 'ease');

      //also animate in the MEDAL! WOO!
      if (wonmedal) {
         $("#medal").css({ scale: 2, opacity: 0 });
         $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
      }
   });

   //make the replay button clickable
   replayclickable = true;
}

$("#replay").click(async function () {
   //make sure we can only click once
   if (!replayclickable)
      return;
   else
      replayclickable = false;
   
   // Claim reward before starting new game
   if (selectedAccount && score > 0) {
      try {
         // Show loading modal
         $("#claim-reward-modal").css("display", "flex");
         $("#claim-reward-modal .claim-reward-message").text("Processing reward claim...");
         
         console.log("Claiming reward for score:", score);
         const floppyContract = new web3.eth.Contract(FLOPPY_ABI, FLOPPY_ADDRESS);
         
         // Estimate gas for the transaction
         const gasEstimate = await floppyContract.methods.claimReward(score).estimateGas({
            from: selectedAccount
         });

         // Send transaction
         const tx = await floppyContract.methods.claimReward(score).send({
            from: selectedAccount,
            gas: Math.round(gasEstimate * 1.2)
         });

         console.log('Claimed reward successfully:', tx);
         
         // Wait for transaction confirmation
         const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
         
         // Update wallet info after claiming
         await fetchAccountData();
         
         // Get updated balances
         const ethBalance = await web3.eth.getBalance(selectedAccount);
         const tickets = await floppyContract.methods.tickets(selectedAccount).call();
         const flpBalance = await floppyContract.methods.balanceOf(selectedAccount).call();
         
         try {
             // Safely update UI with new balances
             const walletContent = document.querySelector(".wallet-content");
             if (walletContent) {
                 const balanceElements = walletContent.querySelectorAll(".balance-value");
                 if (balanceElements.length > 0) {
                     for (let i = 0; i < balanceElements.length; i++) {
                         if (i === 0) {
                             // Convert TEA balance to integer
                             const teaBalance = Math.floor(parseFloat(web3.utils.fromWei(ethBalance, 'ether')));
                             balanceElements[i].textContent = teaBalance;
                         }
                         if (i === 1) balanceElements[i].textContent = tickets;
                         if (i === 2) balanceElements[i].textContent = web3.utils.fromWei(flpBalance, 'ether');
                     }
                 }
             }
         } catch (uiError) {
             console.log('UI update error:', uiError);
         }
         
         // Show success message with updated balances
         $("#claim-reward-modal .claim-reward-message").html(`
            <div class="claim-reward-success">
               Reward claimed successfully!<br>
               Score: ${score}<br>
               FLP received: ${score * 100}<br>
               Current tickets: ${tickets}<br>
               Current FLP balance: ${web3.utils.fromWei(flpBalance, 'ether')}
            </div>
         `);
         
         // Reset game state first
         score = 0;
         isSubmit = false;
         
         // Hide modal and transition to splash screen after delay
         setTimeout(() => {
            $("#claim-reward-modal").fadeOut();
            soundSwoosh.stop();
            soundSwoosh.play();

            $("#scoreboard").transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function () {
               $("#scoreboard").css("display", "none");
               
               // Make replay clickable again
               replayclickable = true;
               
               // Start new game
               showSplash();
            });
         }, 2000);
         
      } catch (error) {
         console.error('Error claiming reward:', error);
         let errorMessage = "Unable to claim reward. ";
         
         if (error.code === 4001) {
            errorMessage += "Transaction cancelled.";
         } else if (error.message.includes("No tickets available")) {
            errorMessage += "You don't have any tickets to claim reward.";
         } else {
            errorMessage += "Please try again.";
         }
         
         // Show error in modal
         $("#claim-reward-modal .claim-reward-message").html(`
            <div class="claim-reward-error">${errorMessage}</div>
         `);
         
         // Hide modal and enable replay button after error
         setTimeout(() => {
            $("#claim-reward-modal").fadeOut();
            replayclickable = true;
         }, 2000);
      }
   } else {
      console.log("Cannot claim reward: ", selectedAccount ? "Score is 0" : "Wallet not connected");
      
      soundSwoosh.stop();
      soundSwoosh.play();

      $("#scoreboard").transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function () {
         $("#scoreboard").css("display", "none");
         
         // Reset game state
         score = 0;
         isSubmit = false;
         replayclickable = true;
         
         // Start new game
         showSplash();
      });
   }
});

function playerScore() {
   score += 1;
   //play score sound
   soundScore.stop();
   soundScore.play();
   setBigScore();
}

function updatePipes() {
   //Do any pipes need removal?
   $(".pipe").filter(function () { return $(this).position().left <= -100; }).remove()

   //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
   var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
   var bottomheight = (flyArea - pipeheight) - topheight;
   var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
   $("#flyarea").append(newpipe);
   pipes.push(newpipe);
}

var isIncompatible = {
   Android: function () {
      return navigator.userAgent.match(/Android/i);
   },
   BlackBerry: function () {
      return navigator.userAgent.match(/BlackBerry/i);
   },
   iOS: function () {
      return navigator.userAgent.match(/iPhone|iPad|iPod/i);
   },
   Opera: function () {
      return navigator.userAgent.match(/Opera Mini/i);
   },
   Safari: function () {
      return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
   },
   Windows: function () {
      return navigator.userAgent.match(/IEMobile/i);
   },
   any: function () {
      return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
   }
};
