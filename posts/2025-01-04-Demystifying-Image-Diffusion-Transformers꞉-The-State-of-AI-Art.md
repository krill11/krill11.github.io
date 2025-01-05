![Nordic Mountains](images/diffusion_eye.jpg)

The rise of AI-powered image generation has captivated artists, technologists, and the public alike. Behind the scenes, a sophisticated model called the Image Diffusion Transformer (IDT) is transforming the way machines create visuals. Let’s delve into the science behind this revolutionary technology and explore how it enables stunning art generation while being remarkably accessible.

## What Are Image Diffusion Transformers?

At its heart, the Image Diffusion Transformer trains on progressively noisier versions of images paired with descriptive keywords. This process teaches the model how to recreate a clean, coherent image from its noisy counterpart while preserving the meaning conveyed by the keywords.

## Hands-On Demo

Curious to see how it works? Explore this interactive demo from Hugging Face, where you can generate your own AI art using a diffusion model. Simply input a text description, and watch as the model brings your vision to life:

<script
	type="module"
	src="https://gradio.s3-us-west-2.amazonaws.com/3.15.0/gradio.js"
></script>

<gradio-app src="https://videoprojector-stabilityai-stable-diffusion-2.hf.space"></gradio-app>


<iframe
	src="https://videoprojector-stabilityai-stable-diffusion-2.hf.space"
	frameborder="0"
	style="min-height: 540px"
	scrolling="no"
></iframe>

Notice that more detailed prompts result in better output. This is due to the fact that adding keywords to the prompt utilizes more of the model, resulting in better outputs.

## How It Works

![Nordic Mountains](images/diffusion_schematics.png)

The training pipeline involves the following steps:

1. Adding Noise: Training begins by deliberately corrupting an image with varying levels of noise, creating a spectrum of distorted versions from slightly blurry to completely unrecognizable.

2. Keyword Alignment: Each noisy image is paired with descriptive keywords (e.g., “sunny beach” or “modern skyscraper”). The model learns to associate these keywords with the features present in the image, even when obscured by noise. This ensures that during generation, the model can accurately reconstruct the content aligned with a textual description.

3. Learning to Denoise: Using millions of image-keyword pairs, the model learns how to iteratively remove noise while ensuring the output remains consistent with the descriptive keywords. This step-by-step refinement is guided by a powerful architecture combining diffusion principles and transformers.

Unlike traditional generative models, Image Diffusion Transformers usually generate images in a sequence of steps. Each step gradually improves upon the last, resulting in highly detailed and accurate outputs. This process mimics the way an artist might layer details onto a sketch, and results in a much higher quality output than can be obtained from a single step. This is due to the fact that the model is trained on progressively noisier images, and so needs to mimic that progression in reverse to arrive at a result.

This approach is originally described in [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239) back in 2020.

## Popular Models

Several groundbreaking models have emerged in the field of image diffusion, each showcasing unique advancements:

[Stable Diffusion 3](https://stability.ai/news/stable-diffusion-3): This model leverages multiple layers of diffusion for enhanced detail and accuracy. It is celebrated for its efficiency and adaptability, making it a favorite among developers and homebrewers, as it can be run at home, on mid-range hardware.

[FLUX](https://education.civitai.com/quickstart-guide-to-flux-1/): A cutting-edge system employing text encoders to generate coherent text in its images, while also maintaining a high level of fidelity. FLUX can be run at home, however requires a state of the art GPU, such as an Nvidia RTX 4090.

[Midjourney](https://www.midjourney.com/home): Known for its popularity and user-friendly interface, Midjourney empowers creators to craft stunning visuals effortlessly. Its emphasis on accessibility has made it a household name in AI art generation. This model is only accessible through Midjourney's Discord server.

**References:**

1. Ho, J., Jain, A., & Abbeel, P. (2020). Denoising Diffusion Probabilistic Models. arXiv:2006.11239.

2. Vaswani, A., et al. (2017). Attention Is All You Need. arXiv:1706.03762.

3. Rombach, R., et al. (2022). Latent Diffusion Models. arXiv:2112.10752.

4. Saharia, C., et al. (2022). Imagen: Photorealistic Text-to-Image Diffusion Models. arXiv:2205.11487.