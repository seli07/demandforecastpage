# Demand Forecasting Pipeline — Interactive Demo

NeuralProphet with parallelized hyperparameter tuning across regional demand models.

**Live demo:** `https://YOUR_USERNAME.github.io/demand-forecasting-demo/`

## Deploy to GitHub Pages (5 minutes)

### Step 1: Create the repo

Go to [github.com/new](https://github.com/new) and create a repo named `demand-forecasting-demo` (public).

### Step 2: Push this code

```bash
cd demand-forecasting-demo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/demand-forecasting-demo.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. That's it — the workflow will auto-run on push

### Step 4: Wait ~2 minutes

The GitHub Action will build and deploy. Your demo will be live at:

```
https://YOUR_USERNAME.github.io/demand-forecasting-demo/
```

### Updating the base path

If you name your repo something other than `demand-forecasting-demo`, update the `base` in `vite.config.js`:

```js
base: '/YOUR-REPO-NAME/',
```

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## What this shows

- Interactive NeuralProphet forecasting pipeline visualization
- Adjustable data sparsity, seasonality, and region count
- Confidence interval behavior with sparse data
- Model segmentation by work type (install/repair, fiber/copper, etc.)
- Pipeline effort distribution (percentages, not hours)
- Industry-agnostic framing with disclaimer
