import axios from 'axios';
import config from './config';

export default axios.create({
	baseURL: 'https://www.freelancer.com/api/',
	headers: { 'freelancer-oauth-v1': config.accessToken },
});
