import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Container,
  Flag,
  Header,
  Icon,
  Input,
  Popup,
  Table,
  Transition,
} from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import config from './config';
import api from './api';

const getValue = (obj, key) => {
  const attrs = key.split('.');
  return attrs.reduce((o, k) => (Array.isArray(o) ? o.map(x => x[k]) : o[k]), obj);
};

const utcToDatetime = utc => {
  const date = new Date(null);
  date.setSeconds(utc - date.getTimezoneOffset() * 60);
  return date.toISOString().substr(11, 8);
};

const getNow = () => {
  const date = new Date();
  date.setSeconds(date.getSeconds() - date.getTimezoneOffset() * 60);
  return date
    .toISOString()
    .substr(0, 19)
    .replace('T', ' ');
};

const isNumeric = n => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

const truncate = (str, limit) => {
  if (str.length <= limit) return str;

  return `${str.slice(limit)}...`;
};

export default () => {
  const [projects, setProjects] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [bidAmounts, setBidAmounts] = useState({});

  const MAX_DESCRIPTION_LENGTH = 1000;

  useEffect(() => {
    const fetchData = async () => {
      setUpdatedAt(''); // make it blank to trigger transition
      setUpdatedAt(getNow());

      const skills = await api.get('/projects/0.1/jobs/', {
        params: {
          job_names: config.skills,
        },
      });
      const skillIds = skills.data.result.map(({ id }) => id);

      const resp = await api.get('/projects/0.1/projects/active/', {
        params: {
          limit: config.limit,
          project_types: config.projectTypes,
          jobs: skillIds,
          full_description: true,
          job_details: true,
          compact: false,
        },
      });

      const { projects } = resp.data.result;
      const projectIds = projects.map(({ id }) => id);

      // find bidded projects
      const bids = await api.get('/projects/0.1/bids/', {
        params: {
          projects: projectIds,
          bidders: [config.userId],
        },
      });

      const biddedIds = bids.data.result.bids.map(bid => bid.project_id);

      const keys = [
        'id',
        'status',
        'title',
        'seo_url',
        'description',
        'preview_description',
        'jobs.name',
        'currency.code',
        'currency.country',
        'budget.minimum',
        'budget.maximum',
        'bid_stats.bid_count',
        'bid_stats.bid_avg',
        'submitdate',
      ];

      setProjects(prevState => {
        // make a notify sound when new projects are found
        if (prevState.filter(({ id }) => !projectIds.includes(id)).length > 0) {
          const audio = new Audio('notify.mp3');
          audio.play();
        }

        return projects.map(prj =>
          keys.reduce((obj, k) => ({ [k]: getValue(prj, k), ...obj }), {
            bidded: biddedIds.includes(prj.id),
          })
        );
      });
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
      <Header dividing as="h2" color="blue">
        <Transition visible={!!updatedAt} animation="fade" duration={1000}>
          <div>
            <Icon name="clock outline" style={{ margin: 3 }} />
            Last Updated: {updatedAt}
          </div>
        </Transition>
      </Header>
      <Table celled striped structured>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell rowSpan="2" textAlign="center">
              No.
            </Table.HeaderCell>
            <Table.HeaderCell rowSpan="2">Title (hover to see the description)</Table.HeaderCell>
            <Table.HeaderCell rowSpan="2">Submitted</Table.HeaderCell>
            <Table.HeaderCell colSpan="3" textAlign="center">
              Budget
            </Table.HeaderCell>
            <Table.HeaderCell colSpan="2" textAlign="center">
              Bid Stats
            </Table.HeaderCell>
            <Table.HeaderCell rowSpan="2" textAlign="center">
              Bid
            </Table.HeaderCell>
            <Table.HeaderCell rowSpan="2" textAlign="center">
              Bidded
            </Table.HeaderCell>
          </Table.Row>
          <Table.Row>
            <Table.HeaderCell>Min</Table.HeaderCell>
            <Table.HeaderCell>Max</Table.HeaderCell>
            <Table.HeaderCell>Currency</Table.HeaderCell>
            <Table.HeaderCell>Count</Table.HeaderCell>
            <Table.HeaderCell>Average</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {projects.map((project, idx) => (
            <Table.Row key={project.id}>
              <Table.Cell textAlign="center">{idx + 1}</Table.Cell>
              <Table.Cell>
                <Popup
                  basic
                  trigger={
                    <a
                      href={`https://www.freelancer.com/projects/${project.seo_url}`}
                      rel="noopener noreferrer"
                      style={{ fontWeight: 'bold' }}
                      target="_blank"
                    >
                      {project.title}
                    </a>
                  }
                  content={
                    <Card fluid>
                      <Card.Content>
                        <Card.Header as={Header} dividing>
                          Details
                        </Card.Header>
                        <Card.Description>
                          {truncate(project.description, MAX_DESCRIPTION_LENGTH)}
                        </Card.Description>
                        <Card.Header as={Header} dividing>
                          Skills Required
                        </Card.Header>
                        <Card.Description>{project['jobs.name'].join(', ')}</Card.Description>
                      </Card.Content>
                    </Card>
                  }
                  wide="very"
                  // position="right center"
                />
              </Table.Cell>
              <Table.Cell>{utcToDatetime(project.submitdate)}</Table.Cell>
              <Table.Cell>{project['budget.minimum']}</Table.Cell>
              <Table.Cell>{project['budget.maximum']}</Table.Cell>
              <Table.Cell>
                <Flag name={`${project['currency.country'].toLowerCase()}`} />
                {project['currency.code']}
              </Table.Cell>
              <Table.Cell>{project['bid_stats.bid_count']}</Table.Cell>
              <Table.Cell>{Math.round(project['bid_stats.bid_avg'])}</Table.Cell>
              <Table.Cell>
                <Input
                  fluid
                  action={
                    <Button
                      primary
                      size="small"
                      onClick={() => bidOnProject(project.id, bidAmounts[project.id])}
                      disabled={!(bidAmounts[project.id] && isNumeric(bidAmounts[project.id]))}
                    >
                      <Icon name="paper plane" style={{ margin: 0 }} />
                    </Button>
                  }
                  value={project.id in bidAmounts ? bidAmounts[project.id] : ''}
                  onChange={event => onBidAmountChange(event, project.id)}
                />
              </Table.Cell>
              <Table.Cell textAlign="center">
                {project.bidded && (
                  <Icon name="check" size="large" color="teal" style={{ margin: 0 }} />
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  );
};
