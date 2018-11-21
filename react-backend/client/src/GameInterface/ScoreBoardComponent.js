import React from 'react';
import "../css/my_styles.css";
import "../css/scoreboard.css";

function scoresToArray(scores){
	var names = Object.keys(scores);

	var data = [];
	for(let n of names){
		data.push({'name' : n, 'score': scores[n]});
	};
	return data;
}

export default class ScoreBoardComponent extends React.Component{
	constructor(props){
		super(props);
	}

	render(){
		var sorted = scoresToArray(this.props.scores).sort(function(a, b){
			if(a.score < b.score){
				return 1;
			}
			if(a.score > b.score){
				return -1;
			}
			return 0;
		});

		var self = this;

		return (
			<div>
				<table className="table table-sm table-light rounded">
					<thead className="thead">
						<tr>
							<th scope="col scoreboard-rank-width">Rank</th>
							<th scope="col scoreboard-col-width">Player</th>
							<th scope="col scoreboard-col-width">Score</th>
						</tr>
					</thead>
					<tbody>
						{
							sorted.map(function(item, i) {
								var className = "not-ready";
								var playerName = item.name;
								if(self.props.playersReady){
									if(self.props.playersReady[item.name]){
										className = "table-success";
										playerName += " (Ready)";
									}
								}
								return (
									<tr className={className} key={i}>
										<th scope="row" className="scoreboard-rank-width">{i+1}</th>
										<td className="scoreboard-col-width">{playerName}</td>
										<td className="scoreboard-col-width">{item.score}</td>
									</tr>
								);
							})
						}
					</tbody>
				</table>
			</div>				
		);
	}
}