const express = require('express');
const helmet = require("helmet");
const cors = require("cors");
const yup = require('yup');
const monk = require('monk');
const morgan = require("morgan");
const path = require('path');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { v5: uuidv5 } = require('uuid');

require('dotenv').config();

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

const schema = yup.object().shape({
  slug: yup.string().trim().matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

app.post('/url', slowDown({
  windowMs: 30 * 1000,
  delayAfter: 1,
  delayMs: 500,
}), rateLimit({
  windowMs: 30 * 1000,
  max: 1,
}), async (req, res, next) => {
  let { slug, url } = req.body;
  try {
    await schema.validate({ slug, url });
    if (url.includes('localhost:3010')) {
      throw new Error('Stop it');
    }
    if (!slug) {
      slug = uuidv5();
    } else {
      const existing = await urls.findOne({ slug });
      if (existing) {
        throw new Error('Slug in use');
      }
    }
    slug = slug.toLowerCase();
    const newUrl = { url, slug };
    const created = await urls.insert(newUrl);
    res.json(created);
  } catch (error) {
    next(error);
  }
});


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
