import { summarizeMealSession } from './src/lib/openai.js';

async function test() {
  const dummyFeedback = [
    { id: '1', tags: ['Hygiene'], text: 'The poha was very salty and cold' },
    { id: '2', tags: ['Taste'], text: 'Too much salt in the food!' },
    { id: '3', tags: ['Quality'], text: 'Please add some fruit to the breakfast.' },
  ];
  const res = await summarizeMealSession(dummyFeedback);
  console.log(JSON.stringify(res, null, 2));
}

test();
