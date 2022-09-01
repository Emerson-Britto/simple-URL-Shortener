const express = require('express');
const helmet = require("helmet");
const cors = require("cors");
const monk = require('monk');
const morgan = require("morgan");
const path = require('path');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { nanoid } = require('nanoid');

const db = monk(process.env.MONGODB_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

app = express();
app.enable('trust proxy');
app.use(morgan("tiny"));
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.static(`${__dirname}/public/`));
const PORT = process.env.PORT || 3010;

notFoundPage = "./public/404.html"

app.get('/', (req, res) => {
	res.json({
		author: 'Emerson-Britto'
	});
});

app.get('/:id', async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.redirect(url.url);
    }
    return res.status(404).sendFile(notFoundPage);
  } catch (error) {
    return res.status(404).sendFile(notFoundPage);
  }
});

app.post("/url", (req, res) => {
	res.json({ msg: "need to implement"})
})


app.use((req, res, next) => {
  res.status(404).sendFile(notFoundPage);
});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? 'internal service error' : error.stack,
  });
});


app.listen(PORT, () => {
    console.log('Started: ' + new Date())
    console.log(`url: http://localhost:${PORT}`)
})
