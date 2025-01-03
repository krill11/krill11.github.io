<?php
$posts_dir = 'posts/';
$files = glob($posts_dir . '*.md');
$files = array_map(function($file) use ($posts_dir) {
    return str_replace($posts_dir, '', $file);
}, $files);
file_put_contents($posts_dir . 'index.json', json_encode($files));