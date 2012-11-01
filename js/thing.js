var state;
(function() {

function Cell(x,y) {
	this.x = x;
	this.y = y;
	this.states = [false];
}
Cell.prototype = {

	frame: 0,
	cursor: false,

	paint: function(element) {
		this.states[this.frame] = !this.states[this.frame];
		update();
	},
	update: function() {
		var grid = state.grid;
		var x = this.x, 
			y = this.y, 
			size = state.size,
			frame = this.frame,
			live = this.states[this.frame]
		;

		var count = (x>0 ? (grid[x-1][y].on(frame) + (y>0 ? grid[x-1][y-1].on(frame) : grid[x-1][size-1].on(frame)) + (y<size-1 ? grid[x-1][y+1].on(frame) : grid[x-1][0].on(frame))) : (grid[size-1][y].on(frame) + (y>0 ? grid[size-1][y-1].on(frame) : grid[size-1][size-1].on(frame)) + (y<size-1 ? grid[size-1][y+1].on(frame) : grid[size-1][0].on(frame))))
				  + (y>0 ? grid[x][y-1].on(frame) : grid[x][size-1].on(frame))
				  + (y<size-1 ? grid[x][y+1].on(frame) : grid[x][0].on(frame))
				  + (x<size-1 ? (grid[x+1][y].on(frame) + (y>0 ? grid[x+1][y-1].on(frame) : grid[x+1][size-1].on(frame)) + (y<size-1 ? grid[x+1][y+1].on(frame) : grid[x+1][0].on(frame))) : (grid[0][y].on(frame) + (y>0 ? grid[0][y-1].on(frame) : grid[0][size-1].on(frame)) + (y<size-1 ? grid[0][y+1].on(frame) : grid[0][0].on(frame))))
		;
		live = count==3 || (live && count==2);
		this.states.push(live);
		this.frame += 1;
		update();
	},
	on: function(frame) {
		if(this.states[frame]===undefined) {
			throw(new Error(this.x+','+this.y+' - '+frame));
		}
		return this.states[frame] ? 1 : 0;
	}
}

state = {
	size: 15,
	height: 15,
	ticker: null,
	going: false,
	grid: [],
	speed: 1,
	dx: 1,
	dy: 0,
	frame: 0,

	//yep, fairly sure these are good names, yep
	turnAcc: 0,		//number of cells since last turn
	turnTurnAcc: 2,	//number of times to move forward turnAccAcc cells before increasing it
	turnAccAcc: 1,	//number of cells to move forward after next turn

	resetCursor: function() {
		state.tx = state.ty = (state.size-1)/2;
		state.dx = 1;
		state.dy = 0;
		state.turnAcc = 0;
		state.turnTurnAcc = 2;
		state.turnAccAcc = 1;
	}
};
for(var i=0;i<state.size;i++) {
	var row = [];
	for(var j=0;j<state.size;j++) {
		row.push(new Cell(i,j));
	}
	state.grid.push(row);
}
state.resetCursor();
state.ox = state.tx;
state.oy = state.ty;

function resetState() {
}




//update the d3 transformations
function update() {
	var td = d3.selectAll('#grid tr').selectAll('td');

	td
		.classed('on',function(d){ return d.states[d.frame]; })
		.classed('cursor',function(d){ return d.cursor })
	;
	$('#framecounter').html(state.frame);
}

//one unit of time passes - wind the spiral round and update all cells 
function tick() {
	var s = state;
	
	s.grid[s.ox][s.oy].cursor = false;
	s.grid[s.tx][s.ty].cursor = true;

	//update cell under cursor
	s.grid[s.tx][s.ty].update();

	//update the cell on the inside of the spiral which now has all its neighbours on the same frame
	if(s.turnAcc>=2) {
		s.grid[s.tx-s.dx+s.dy][s.ty-s.dy-s.dx].update();
	}
	//because we're on a torus, there can be more than one such cell, on opposite sides of the cursor
	if(s.tx==0 && s.ty>1 && s.ty<s.size-1) {
		s.grid[s.size-1][s.ty-1].update();
	}
	if(s.tx==0 && s.ty>1 && s.ty<s.size-1) {
		s.grid[0][s.ty-1].update();
	}
	if(s.ty==s.size-1 && s.tx>1) {
		s.grid[s.tx-1][0].update();
	}
	if(s.ty==s.size-1 && s.tx>1) {
		s.grid[s.tx-1][s.size-1].update();
	}
	//the bottom-right cell gets two updates because it's the last to be updated by the cursor.
	//it also has 8 neighbours, which all get their second update at the same time.
	//two of them get dealt with by the rules above though
	if(s.tx==s.size-1 && s.ty==s.size-1) {	
		s.grid[s.size-1][s.size-1].update();
		s.grid[0][0].update();
		s.grid[0][s.size-2].update();
		s.grid[0][s.size-1].update();
		s.grid[s.size-1][0].update();
		s.grid[s.size-1][s.size-2].update();
	}

	//move cursor
	s.ox = s.tx;
	s.oy = s.ty;
	s.tx += s.dx;
	s.ty += s.dy;
	s.turnAcc += 1;
	if(s.turnAcc==s.turnAccAcc) {
		var dx = s.dy, dy = -s.dx;
		s.dx = dx; 
		s.dy = dy;
		s.turnTurnAcc -= 1;
		if(s.turnTurnAcc==0) {
			s.turnTurnAcc = 2;
			s.turnAccAcc += 1;
		}
		s.turnAcc = 0;
	}

	//when the spiral leaves the grid, reset back to the centre
	if(s.tx==s.size) {
		state.frame += 1;
		state.resetCursor();
		/*
		//and pop a frame off every cell's state, since it won't be needed again
		for(var i=0;i<state.size;i++) {
			for(var j=0;j<state.size;j++) {
				state.grid[i][j].frame -= 1;
				state.grid[i][j].states.splice(0,1);
			}
		}
		*/
	}
}

$(function() {

	var table = d3.select('#grid');

	table
		.on('mouseup',function() {
			state.mousedown = false;
			state.paintColour = null;
			update();
		})

	var tr = d3.select('#grid').selectAll('tr')
		.data(state.grid)
		.enter().append('tr')
	;
	var td = tr.selectAll('td')
		.data(function(d){ return d; }, function(d) { return d.x+','+d.y; })
		.enter().append('td')
	;

	td
		.on('click', function(d) {
			d.paint(this);
		})
	;

	update();

	$('#play').on('click',function() {
		state.going = !state.going;
		if(state.going)
			state.ticker = setInterval(tick,state.speed);
		else
			clearInterval(state.ticker);
		$(this).html(state.going ? 'Pause' : 'Play');
	});
	$('#tick').on('click',function() {
		tick();
	});
	$('#randomise').on('click',function() {
		for(var i=0;i<state.size;i++) {
			for(var j=0;j<state.size;j++) {
				var cell = state.grid[i][j];
				cell.states[cell.states.length-1]=Math.random()>0.5 ? true : false;
			}
		}
		update();
	});
});

})();
