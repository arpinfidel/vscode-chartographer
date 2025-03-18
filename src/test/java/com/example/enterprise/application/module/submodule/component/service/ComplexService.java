package com.example.enterprise.application.module.submodule.component.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

public interface ComplexService<T extends Comparable<T>, R extends AutoCloseable> {
    void processAndTransform(List<T> data);

    <X extends Number & Comparable<X>, Y extends Comparable<Y>> CompletableFuture<Map<X, List<Y>>>
            processComplexDataStructure(
                List<T> inputData,
                Function<T, X> keyTransformer,
                Function<T, Y> valueTransformer,
                Optional<R> context);

    <A extends Comparable<A>, B extends AutoCloseable & Comparable<B>, C extends Number>
            Map<A, List<Map<B, List<C>>>> handleNestedDataStructures(
                List<Map<A, List<B>>> inputNested,
                Function<B, List<C>> transformer,
                Optional<R> processingContext);

    <E extends Exception> void executeWithComplexGenerics(
            List<? extends Function<? super T, ? extends R>> processors,
            List<? extends Function<? super R, ? extends CompletableFuture<? extends T>>> callbacks)
            throws E;

    void processDataWithNestedCalls(List<T> data);
}