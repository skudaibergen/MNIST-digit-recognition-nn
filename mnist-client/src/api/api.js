import axios from 'axios';

export default {
  sendMnistData: data => axios.post('/prediction', data).then(res => res.data)
}
