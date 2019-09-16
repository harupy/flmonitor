import React, { useState, useEffect } from 'react';
import { Button, Container, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import config from './config';
import api from './api';

const getValue = (obj, key) => {
	const attrs = key.split('.');
	return attrs.reduce((o, k) => (Array.isArray(o) ? o.map((x) => x[k]) : o[k]), obj);
};

const utcToDatetime = (utc) => {
	const date = new Date(null);
	const offset = date.getTimezoneOffset();
	date.setSeconds(utc - offset * 60);
	return date.toISOString().substr(11, 8);
};

const getNow = () => {
	const date = new Date();
	return date.toISOString().substr(0, 19).replace('T', ' ');
};

const isNumeric = (n) => {
	return !isNaN(parseFloat(n)) && isFinite(n);
};

export default () => {
	const [ projects, setProjects ] = useState([]);
	const [ updatedAt, setUpdatedAt ] = useState('');
	const [ bidAmounts, setBidAmounts ] = useState({});

	useEffect(() => {
		const fetchData = async () => {
			const resp = await api.get('/projects/0.1/projects/active/', {
				params: {
					query: config.query,
					limit: config.limit,
					project_types: config.projectTypes,
					bidders: [ config.userId ],
					full_description: true,
					job_details: true,
					compact: false,
				},
			});

			const { projects } = resp.data.result;
			const ids = projects.map(({ id }) => id);

			// find bidded projects
			const bids = await api.get('/projects/0.1/bids/', {
				params: {
					projects: ids,
					bidders: [ config.userId ],
				},
			});
			const biddedIds = bids.data.result.bids.map((bid) => bid.project_id);

			const keys = [
				'id',
				'status',
				'title',
				'seo_url',
				'description',
				'preview_description',
				'jobs.category.name',
				'currency.code',
				'currency.country',
				'budget.minimum',
				'budget.maximum',
				'bid_stats.bid_count',
				'bid_stats.bid_avg',
				'submitdate',
			];

			setProjects(
				projects.map((prj) =>
					keys.reduce((o, k) => ({ [k]: getValue(prj, k), ...o }), {
						bidded: biddedIds.includes(prj.id),
					})
				)
			);
			setUpdatedAt(getNow());
		};
		fetchData();
		setInterval(fetchData, config.interval);
	}, []);

	const bidOnProject = async (project_id, amount) => {
		const data = {
			project_id,
			amount: parseFloat(amount),
			description: config.proposal,
			bidder_id: config.userId,
			milestone_percentage: 100,
			period: 7,
		};
		await api.post('/projects/0.1/bids/', data);
	};

	const onBidAmountChange = (event, id) => {
		const { value } = event.target;
		const copy = { ...bidAmounts };
		copy[id] = value;
		setBidAmounts(copy);
	};

	return (
		<Container style={{ padding: 10, width: '100%', fontSize: 12 }}>
			<Header color="blue">
				<Icon name="clock outline" style={{ margin: 3 }} />Last Updated: {updatedAt}
			</Header>
			<Table celled structured>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell rowSpan="2">No.</Table.HeaderCell>
						<Table.HeaderCell rowSpan="2">
							Title (Hover to see the description)
						</Table.HeaderCell>
						<Table.HeaderCell rowSpan="2">Submit</Table.HeaderCell>
						<Table.HeaderCell colSpan="3" textAlign="center">
							Budget
						</Table.HeaderCell>
						<Table.HeaderCell colSpan="2" textAlign="center">
							Bid Stats
						</Table.HeaderCell>
						<Table.HeaderCell rowSpan="2" textAlign="center">
							Bid
						</Table.HeaderCell>
					</Table.Row>
					<Table.Row>
						<Table.HeaderCell textAlign="center">Min</Table.HeaderCell>
						<Table.HeaderCell textAlign="center">Max</Table.HeaderCell>
						<Table.HeaderCell textAlign="center">Currency</Table.HeaderCell>
						<Table.HeaderCell textAlign="center">Count</Table.HeaderCell>
						<Table.HeaderCell textAlign="center">Average</Table.HeaderCell>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{projects.map((project, idx) => (
						<Table.Row key={project.id} positive={!!project.bidded}>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>
								<Popup
									trigger={
										<a
											href={`https://www.freelancer.com/projects/${project.seo_url}`}
											rel="noopener noreferrer"
											target="_blank"
										>
											{project.title}
										</a>
									}
									content={project.description}
									wide="very"
									position="right center"
								/>
							</Table.Cell>
							<Table.Cell>{utcToDatetime(project.submitdate)}</Table.Cell>
							<Table.Cell>{project['budget.minimum']}</Table.Cell>
							<Table.Cell>{project['budget.maximum']}</Table.Cell>
							<Table.Cell>{project['currency.country']}</Table.Cell>
							<Table.Cell>{project['bid_stats.bid_count']}</Table.Cell>
							<Table.Cell>{Math.round(project['bid_stats.bid_avg'])}</Table.Cell>
							<Table.Cell>
								<Input
									fluid
									action={
										<Button
											primary
											size="mini"
											onClick={() =>
												bidOnProject(project.id, bidAmounts[project.id])}
											disabled={
												!(
													bidAmounts[project.id] &&
													isNumeric(bidAmounts[project.id])
												)
											}
										>
											Bid
										</Button>
									}
									value={project.id in bidAmounts ? bidAmounts[project.id] : ''}
									onChange={(event) => onBidAmountChange(event, project.id)}
								/>
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</Container>
	);
};
